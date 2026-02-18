import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { UserService } from '../user/user.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private userService: UserService,
  ) {}

  async createWallet(userId: string, dto: CreateWalletDto): Promise<Wallet> {
    await this.userService.findUserByIdOrFail(userId);

    const currency = dto.currency.toUpperCase();
    const existingWallet = await this.walletRepository.findOne({
      where: { userId, currency },
    });
    if (existingWallet) {
      throw new ConflictException(
        `Wallet with currency ${currency} already exists for this user`,
      );
    }

    const wallet = this.walletRepository.create({
      userId,
      currency,
      balance: '0',
    });
    return this.walletRepository.save(wallet);
  }

  async getWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({ where: { userId } });
  }

  async getWalletById(id: string, userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({ where: { id } });
    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${id} not found`);
    }
    if (wallet.userId !== userId) {
      throw new ForbiddenException('You do not have access to this wallet');
    }
    return wallet;
  }

  async getWalletByUserIdAndCurrency(
    userId: string,
    currency: string,
  ): Promise<Wallet> {
    return this.walletRepository.findOne({ where: { userId, currency } });
  }

  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({ where: { userId } });
  }

  /**
   * Find wallet by id only (internal use e.g. webhook). Does not check ownership.
   */
  async findWalletById(walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${walletId} not found`);
    }
    return wallet;
  }

  /**
   * Credit wallet balance (internal use e.g. payment webhook). Amount in major currency units.
   */
  async creditBalance(
    walletId: string,
    amountInMajor: number,
  ): Promise<Wallet> {
    const wallet = await this.findWalletById(walletId);
    const current = parseFloat(wallet.balance);
    wallet.balance = (current + amountInMajor).toFixed(2);
    return this.walletRepository.save(wallet);
  }

  /**
   * Debit wallet balance (internal use e.g. transfer). Throws if insufficient balance.
   */
  async debitBalance(walletId: string, amountInMajor: number): Promise<Wallet> {
    const wallet = await this.findWalletById(walletId);
    const current = parseFloat(wallet.balance);
    if (current < amountInMajor) {
      throw new BadRequestException('Insufficient balance');
    }
    wallet.balance = (current - amountInMajor).toFixed(2);
    return this.walletRepository.save(wallet);
  }
}
