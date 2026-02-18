import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../entities/transaction.entity';
import { UserService } from '../user/user.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private walletService: WalletService,
    private userService: UserService,
  ) {}

  async createTransaction(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    await this.walletService.getWalletById(dto.walletId, userId);

    const transaction = this.transactionRepository.create({
      type: dto.type,
      walletId: dto.walletId,
      amount: String(dto.amount),
      reference: dto.reference ?? null,
      metadata: dto.metadata ?? null,
      status: dto.status ?? TransactionStatus.COMPLETED,
      transferId: dto.transferId ?? null,
    });

    return this.transactionRepository.save(transaction);
  }

  async findTransactionById(id: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({ where: { id } });
  }

  async findTransactionByIdOrFail(id: string): Promise<Transaction> {
    const transaction = await this.findTransactionById(id);
    if (!transaction) {
      throw new NotFoundException(`Transaction with id ${id} not found`);
    }
    return transaction;
  }

  async allTransactions(): Promise<Transaction[]> {
    return this.transactionRepository.find();
  }

  async updateTransaction(
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const transaction = await this.findTransactionByIdOrFail(id);
    const updates: Partial<Transaction> = {
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.walletId !== undefined && { walletId: dto.walletId }),
      ...(dto.amount !== undefined && { amount: String(dto.amount) }),
      ...(dto.reference !== undefined && { reference: dto.reference }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.transferId !== undefined && { transferId: dto.transferId }),
    };
    return this.transactionRepository.save({ ...transaction, ...updates });
  }

  async transactionByReference(reference: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({ where: { reference } });
  }

  async transactionByReferenceOrFail(reference: string): Promise<Transaction> {
    const transaction = await this.transactionByReference(reference);
    if (!transaction) {
      throw new NotFoundException(
        `Transaction with reference ${reference} not found`,
      );
    }
    return transaction;
  }

  async transactionsByWalletId(walletId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({ where: { walletId } });
  }

  /**
   * All transactions for a user (across all their wallets).
   * Joins through wallet since Transaction has walletId, not userId.
   */
  async transactionsByUserId(userId: string): Promise<Transaction[]> {
    await this.userService.findUserByIdOrFail(userId);
    return this.transactionRepository
      .createQueryBuilder('t')
      .innerJoin('t.wallet', 'w')
      .where('w.userId = :userId', { userId })
      .orderBy('t.createdAt', 'DESC')
      .getMany();
  }

  async transactionsByWalletIdOrFail(walletId: string): Promise<Transaction[]> {
    const transactions = await this.transactionsByWalletId(walletId);
    if (transactions.length === 0) {
      throw new NotFoundException(
        `No transactions found for wallet ${walletId}`,
      );
    }
    return transactions;
  }

  /**
   * Admin: aggregate all transactions (credit + transfer) for a given month.
   * Returns total count, total amount, and breakdown by type and by currency.
   */
  async getMonthlySummary(
    year: number,
    month: number,
  ): Promise<{
    year: number;
    month: number;
    totalCount: number;
    totalAmount: string;
    byType: Partial<
      Record<
        TransactionType,
        { count: number; totalAmount: string }
      >
    >;
    byCurrency: Record<string, { count: number; totalAmount: string }>;
  }> {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    const totals = await this.transactionRepository
      .createQueryBuilder('t')
      .select('COUNT(t.id)', 'count')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'totalAmount')
      .where('t.created_at >= :start AND t.created_at < :end', { start, end })
      .getRawOne<{ count: string; totalAmount: string }>();

    const byTypeRows = await this.transactionRepository
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('COUNT(t.id)', 'count')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'totalAmount')
      .where('t.created_at >= :start AND t.created_at < :end', { start, end })
      .groupBy('t.type')
      .getRawMany<{ type: TransactionType; count: string; totalAmount: string }>();

    const byCurrencyRows = await this.transactionRepository
      .createQueryBuilder('t')
      .innerJoin('t.wallet', 'w')
      .select('w.currency', 'currency')
      .addSelect('COUNT(t.id)', 'count')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'totalAmount')
      .where('t.created_at >= :start AND t.created_at < :end', { start, end })
      .groupBy('w.currency')
      .getRawMany<{ currency: string; count: string; totalAmount: string }>();

    const byType: Partial<
      Record<TransactionType, { count: number; totalAmount: string }>
    > = {};
    for (const row of byTypeRows) {
      byType[row.type] = {
        count: Number(row.count),
        totalAmount: String(row.totalAmount),
      };
    }

    const byCurrency: Record<
      string,
      { count: number; totalAmount: string }
    > = {};
    for (const row of byCurrencyRows) {
      byCurrency[row.currency] = {
        count: Number(row.count),
        totalAmount: String(row.totalAmount),
      };
    }

    return {
      year,
      month,
      totalCount: Number(totals?.count ?? 0),
      totalAmount: String(totals?.totalAmount ?? '0'),
      byType,
      byCurrency,
    };
  }
}
