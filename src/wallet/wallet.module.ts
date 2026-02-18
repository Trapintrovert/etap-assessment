import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { Wallet } from '../entities/wallet.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [UserModule, TypeOrmModule.forFeature([Wallet])],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
