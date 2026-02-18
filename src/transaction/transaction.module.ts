import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../entities/transaction.entity';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction]), UserModule, WalletModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
