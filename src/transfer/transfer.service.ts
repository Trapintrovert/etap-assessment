import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import { Transfer, TransferStatus } from '../entities/transfer.entity';
import { Wallet } from '../entities/wallet.entity';
import { WalletService } from '../wallet/wallet.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(Transfer)
    private transferRepository: Repository<Transfer>,
    private walletService: WalletService,
    private dataSource: DataSource,
    private config: ConfigService,
  ) {}

  /**
   * Create a wallet-to-wallet transfer.
   *
   * For amounts ≤ threshold: executes immediately (debit source, credit destination,
   * create Transfer + ledger Transactions in a single DB transaction).
   *
   * For amounts > threshold: creates Transfer with PENDING_APPROVAL; no money moves
   * until an admin approves.
   *
   * @param userId - Current user (must own source wallet)
   * @param dto - fromWalletId, toWalletId, amount
   * @returns Transfer (status COMPLETED or PENDING_APPROVAL)
   */
  async createTransfer(
    userId: string,
    dto: CreateTransferDto,
  ): Promise<Transfer> {
    const { fromWalletId, toWalletId, amount } = dto;

    await this.validateTransferRequest(
      userId,
      fromWalletId,
      toWalletId,
      amount,
    );

    const threshold = this.config.get<number>(
      'transfer.largeTransferThreshold',
      1_000_000,
    );

    if (amount > threshold) {
      return this.createPendingTransfer(
        fromWalletId,
        toWalletId,
        amount,
        userId,
      );
    }

    return this.executeTransfer(fromWalletId, toWalletId, amount, userId);
  }

  /**
   * Approve a pending transfer (admin only). Executes debit/credit and updates transfer.
   * Uses SELECT ... FOR UPDATE so concurrent approve calls do not double-execute.
   *
   * @param id - Transfer ID
   * @param approvedById - Admin user ID approving the transfer
   */
  async approveTransfer(id: string, approvedById: string): Promise<Transfer> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transferRepo = queryRunner.manager.getRepository(Transfer);
      const transfer = await transferRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!transfer) {
        throw new BadRequestException('Transfer not found');
      }
      if (transfer.status !== TransferStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
          `Transfer is not pending approval (status: ${transfer.status})`,
        );
      }

      const amountNum = parseFloat(transfer.amount);
      const walletRepo = queryRunner.manager.getRepository(Wallet);
      const fromWallet = await walletRepo.findOneOrFail({
        where: { id: transfer.fromWalletId },
      });
      const toWallet = await walletRepo.findOneOrFail({
        where: { id: transfer.toWalletId },
      });
      if (fromWallet.currency !== toWallet.currency) {
        throw new BadRequestException(
          'Source and destination wallets must have the same currency',
        );
      }
      const fromBalance = parseFloat(fromWallet.balance);
      if (fromBalance < amountNum) {
        throw new BadRequestException('Insufficient balance for approval');
      }

      const result = await this.executeApprovedTransferInTx(
        queryRunner,
        transfer,
        approvedById,
      );
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reject a pending transfer (admin only). No money moves; status is set to REJECTED.
   *
   * @param id - Transfer ID
   */
  async rejectTransfer(id: string): Promise<Transfer> {
    const transfer = await this.transferRepository.findOneOrFail({
      where: { id },
    });

    if (transfer.status !== TransferStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Transfer is not pending approval (status: ${transfer.status})`,
      );
    }

    transfer.status = TransferStatus.REJECTED;
    return this.transferRepository.save(transfer);
  }

  async allPendingTransfers(): Promise<Transfer[]> {
    return this.transferRepository.find({
      where: { status: TransferStatus.PENDING_APPROVAL },
    });
  }

  /**
   * Execute an approved transfer inside an existing transaction (caller holds lock on transfer).
   */
  private async executeApprovedTransferInTx(
    queryRunner: QueryRunner,
    transfer: Transfer,
    approvedById: string,
  ): Promise<Transfer> {
    const { id, fromWalletId, toWalletId, amount } = transfer;
    const amountNum = parseFloat(amount);

    const walletRepo = queryRunner.manager.getRepository(Wallet);
    const transferRepo = queryRunner.manager.getRepository(Transfer);
    const transactionRepo = queryRunner.manager.getRepository(Transaction);

    const from = await walletRepo.findOneOrFail({
      where: { id: fromWalletId },
    });
    const to = await walletRepo.findOneOrFail({
      where: { id: toWalletId },
    });

    const fromBalance = parseFloat(from.balance);
    if (fromBalance < amountNum) {
      throw new BadRequestException('Insufficient balance');
    }
    from.balance = (fromBalance - amountNum).toFixed(2);
    to.balance = (parseFloat(to.balance) + amountNum).toFixed(2);

    await walletRepo.save([from, to]);

    const transferEntity = await transferRepo.findOneOrFail({
      where: { id },
    });
    transferEntity.status = TransferStatus.COMPLETED;
    transferEntity.approvedById = approvedById;
    transferEntity.approvedAt = new Date();
    const updatedTransfer = await transferRepo.save(transferEntity);

    const transferOut = transactionRepo.create({
      type: TransactionType.TRANSFER_OUT,
      walletId: fromWalletId,
      amount,
      transferId: id,
    });
    const transferIn = transactionRepo.create({
      type: TransactionType.TRANSFER_IN,
      walletId: toWalletId,
      amount,
      transferId: id,
    });
    await transactionRepo.save([transferOut, transferIn]);

    return updatedTransfer;
  }

  /**
   * Validate transfer request: ownership, wallets exist, same currency, sufficient balance.
   */
  private async validateTransferRequest(
    userId: string,
    fromWalletId: string,
    toWalletId: string,
    amount: number,
  ): Promise<void> {
    if (fromWalletId === toWalletId) {
      throw new BadRequestException(
        'Source and destination wallets must be different',
      );
    }

    const fromWallet = await this.walletService.getWalletById(
      fromWalletId,
      userId,
    );
    const toWallet = await this.walletService.findWalletById(toWalletId);

    if (fromWallet.currency !== toWallet.currency) {
      throw new BadRequestException(
        'Source and destination wallets must have the same currency',
      );
    }

    const balance = parseFloat(fromWallet.balance);
    if (balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }
  }

  /**
   * Create a pending transfer (large amount requiring admin approval). No money moves.
   */
  private async createPendingTransfer(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    userId: string,
  ): Promise<Transfer> {
    const transfer = this.transferRepository.create({
      fromWalletId,
      toWalletId,
      amount: String(amount),
      status: TransferStatus.PENDING_APPROVAL,
      initiatedById: userId,
    });
    return this.transferRepository.save(transfer);
  }

  /**
   * Execute transfer atomically: debit source, credit destination, create Transfer + ledger entries.
   */
  private async executeTransfer(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    userId: string,
  ): Promise<Transfer> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const walletRepo = queryRunner.manager.getRepository(Wallet);
      const transferRepo = queryRunner.manager.getRepository(Transfer);
      const transactionRepo = queryRunner.manager.getRepository(Transaction);

      const from = await walletRepo.findOneOrFail({
        where: { id: fromWalletId },
      });
      const to = await walletRepo.findOneOrFail({
        where: { id: toWalletId },
      });

      const fromBalance = parseFloat(from.balance);
      if (fromBalance < amount) {
        throw new BadRequestException('Insufficient balance');
      }
      from.balance = (fromBalance - amount).toFixed(2);
      to.balance = (parseFloat(to.balance) + amount).toFixed(2);

      await walletRepo.save([from, to]);

      const transfer = transferRepo.create({
        fromWalletId,
        toWalletId,
        amount: String(amount),
        status: TransferStatus.COMPLETED,
        initiatedById: userId,
      });
      const savedTransfer = await transferRepo.save(transfer);

      const transferOut = transactionRepo.create({
        type: TransactionType.TRANSFER_OUT,
        walletId: fromWalletId,
        amount: String(amount),
        transferId: savedTransfer.id,
      });
      const transferIn = transactionRepo.create({
        type: TransactionType.TRANSFER_IN,
        walletId: toWalletId,
        amount: String(amount),
        transferId: savedTransfer.id,
      });
      await transactionRepo.save([transferOut, transferIn]);

      await queryRunner.commitTransaction();
      return savedTransfer;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
