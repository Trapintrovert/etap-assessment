import { Module } from '@nestjs/common';
import { PaystackModule } from '../paystack/paystack.module';
import { TransactionModule } from '../transaction/transaction.module';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [PaystackModule, TransactionModule, WalletModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
