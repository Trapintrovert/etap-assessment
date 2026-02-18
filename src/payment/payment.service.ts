import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TransactionStatus,
  TransactionType,
} from '../entities/transaction.entity';
import { PaystackService } from '../paystack/paystack.service';
import { TransactionService } from '../transaction/transaction.service';
import { WalletService } from '../wallet/wallet.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

export interface InitializePaymentResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paystackService: PaystackService,
    private readonly walletService: WalletService,
    private readonly config: ConfigService,
    private readonly transactionService: TransactionService,
  ) {}

  generatePaymentReference(): string {
    return `PAY_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<InitializePaymentResult> {
    const wallet = await this.walletService.getWalletById(dto.walletId, userId);

    const amountInKobo = Math.round(dto.amount * 100);
    const email = `${userId}@wallet.etap`;
    const callbackUrl = this.config.get<string>('paystack.callbackUrl', '');
    const reference = this.generatePaymentReference();

    const response = await this.paystackService.initializeTransaction({
      email,
      amount: amountInKobo,
      callback_url: callbackUrl || undefined,
      metadata: {
        walletId: wallet.id,
        userId,
        currency: wallet.currency,
      },
      reference,
    });

    const paystackData = response.data;

    await this.transactionService.createTransaction(userId, {
      type: TransactionType.CREDIT,
      walletId: wallet.id,
      amount: dto.amount,
      reference,
      status: TransactionStatus.PENDING,
      metadata: {
        gateway: 'paystack',
        reference,
        amountInKobo: amountInKobo,
      },
    });

    return {
      authorization_url: paystackData.authorization_url,
      access_code: paystackData.access_code,
      reference: paystackData.reference,
    };
  }

  /**
   * Handle Paystack webhook. Verifies signature.
   * - charge.success: credits wallet and sets transaction to COMPLETED (idempotent).
   * - charge.failed: sets transaction to FAILED; no wallet credit.
   */
  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    if (!this.paystackService.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    let payload: {
      event?: string;
      data?: {
        reference?: string;
        amount?: number;
        metadata?: { walletId?: string; userId?: string; currency?: string };
      };
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const event = payload.event;
    const reference = payload.data?.reference;
    if (!event || !reference) {
      return;
    }

    if (event === 'charge.failed') {
      await this.handleChargeFailed(reference);
      this.logger.log(`Webhook processed charge.failed reference=${reference}`);
      return;
    }

    if (event !== 'charge.success') {
      return;
    }

    await this.handleChargeSuccess(payload.data!);
    this.logger.log(
      `Webhook processed charge.success reference=${reference} walletId=${payload.data?.metadata?.walletId ?? 'n/a'}`,
    );
  }

  private async handleChargeFailed(reference: string): Promise<void> {
    const transaction =
      await this.transactionService.transactionByReference(reference);
    if (!transaction) {
      return;
    }
    if (transaction.status !== TransactionStatus.PENDING) {
      return; // already COMPLETED or FAILED
    }
    await this.transactionService.updateTransaction(transaction.id, {
      status: TransactionStatus.FAILED,
    });
  }

  private async handleChargeSuccess(data: {
    reference?: string;
    amount?: number;
    metadata?: { walletId?: string; userId?: string; currency?: string };
  }): Promise<void> {
    const { reference, amount: amountKobo, metadata } = data;
    const walletId = metadata?.walletId;
    if (!walletId) {
      return;
    }

    const transaction = await this.transactionService.transactionByReference(
      reference as string,
    );
    if (!transaction) {
      return;
    }
    if (transaction.status === TransactionStatus.COMPLETED) {
      return; // idempotency: already credited
    }
    if (transaction.status === TransactionStatus.FAILED) {
      return; // already marked failed; do not credit
    }

    const amountInMajor = (amountKobo ?? 0) / 100;
    await this.walletService.creditBalance(walletId, amountInMajor);
    await this.transactionService.updateTransaction(transaction.id, {
      status: TransactionStatus.COMPLETED,
    });
  }
}
