import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transfer } from '../entities/transfer.entity';
import { WalletModule } from '../wallet/wallet.module';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transfer]), WalletModule],
  controllers: [TransferController],
  providers: [TransferService],
})
export class TransferModule {}
