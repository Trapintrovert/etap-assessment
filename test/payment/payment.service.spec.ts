import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from '../../src/payment/payment.service';
import { PaystackService } from '../../src/paystack/paystack.service';
import { TransactionService } from '../../src/transaction/transaction.service';
import { WalletService } from '../../src/wallet/wallet.service';
import { CreatePaymentDto } from '../../src/payment/dto/create-payment.dto';
import {
  TransactionStatus,
  TransactionType,
} from '../../src/entities/transaction.entity';

describe('PaymentService', () => {
  let service: PaymentService;

  const mockWallet = {
    id: 'wallet-uuid-1',
    userId: 'user-uuid-1',
    currency: 'NGN',
    balance: '0',
  };

  const mockPaystackResponse = {
    data: {
      authorization_url: 'https://checkout.paystack.com/xxx',
      access_code: 'abc123',
      reference: 'ref_xyz',
    },
  };

  const mockPaystackService = {
    initializeTransaction: jest.fn(),
    verifyWebhookSignature: jest.fn(),
  };

  const mockWalletService = {
    getWalletById: jest.fn(),
    creditBalance: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) =>
      key === 'paystack.callbackUrl'
        ? 'http://localhost:3000/api/payments/callback'
        : undefined,
    ),
  };

  const mockTransactionService = {
    createTransaction: jest.fn(),
    transactionByReference: jest.fn(),
    updateTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockWalletService.getWalletById.mockResolvedValue(mockWallet);
    mockPaystackService.initializeTransaction.mockResolvedValue(mockPaystackResponse);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PaystackService, useValue: mockPaystackService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    const dto: CreatePaymentDto = { walletId: 'wallet-uuid-1', amount: 5000 };

    it('should initialize Paystack transaction and return authorization URL', async () => {
      const result = await service.createPayment('user-uuid-1', dto);

      expect(mockWalletService.getWalletById).toHaveBeenCalledWith(
        dto.walletId,
        'user-uuid-1',
      );
      expect(mockPaystackService.initializeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user-uuid-1@wallet.etap',
          amount: 500000,
          callback_url: 'http://localhost:3000/api/payments/callback',
          metadata: {
            walletId: mockWallet.id,
            userId: 'user-uuid-1',
            currency: mockWallet.currency,
          },
        }),
      );
      expect(result).toEqual({
        authorization_url: mockPaystackResponse.data.authorization_url,
        access_code: mockPaystackResponse.data.access_code,
        reference: mockPaystackResponse.data.reference,
      });
    });

    it('should convert amount from Naira to kobo', async () => {
      await service.createPayment('user-uuid-1', {
        ...dto,
        amount: 100,
      });

      expect(mockPaystackService.initializeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 10000 }),
      );
    });
  });

  describe('handleWebhook', () => {
    const rawBody = JSON.stringify({
      event: 'charge.success',
      data: {
        reference: 'PAY_123',
        amount: 500000,
        metadata: { walletId: 'wallet-uuid-1', userId: 'user-1' },
      },
    });
    const validSignature = 'valid-sig';

    it('should credit wallet and update transaction on valid signature + charge.success', async () => {
      mockPaystackService.verifyWebhookSignature.mockReturnValue(true);
      mockTransactionService.transactionByReference.mockResolvedValue({
        id: 'tx-1',
        walletId: 'wallet-uuid-1',
        status: TransactionStatus.PENDING,
      });
      mockWalletService.creditBalance.mockResolvedValue(mockWallet);
      mockTransactionService.updateTransaction.mockResolvedValue({});

      await service.handleWebhook(rawBody, validSignature);

      expect(
        mockPaystackService.verifyWebhookSignature,
      ).toHaveBeenCalledWith(rawBody, validSignature);
      expect(mockTransactionService.transactionByReference).toHaveBeenCalledWith(
        'PAY_123',
      );
      expect(mockWalletService.creditBalance).toHaveBeenCalledWith(
        'wallet-uuid-1',
        5000,
      );
      expect(mockTransactionService.updateTransaction).toHaveBeenCalledWith(
        'tx-1',
        { status: TransactionStatus.COMPLETED },
      );
    });

    it('should throw BadRequestException on invalid signature', async () => {
      mockPaystackService.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleWebhook(rawBody, 'invalid-sig'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.handleWebhook(rawBody, 'invalid-sig'),
      ).rejects.toThrow('Invalid webhook signature');
      expect(mockTransactionService.transactionByReference).not.toHaveBeenCalled();
      expect(mockWalletService.creditBalance).not.toHaveBeenCalled();
    });

    it('should be idempotent when transaction already completed (duplicate reference)', async () => {
      mockPaystackService.verifyWebhookSignature.mockReturnValue(true);
      mockTransactionService.transactionByReference.mockResolvedValue({
        id: 'tx-1',
        walletId: 'wallet-uuid-1',
        status: TransactionStatus.COMPLETED,
      });
      mockWalletService.creditBalance.mockClear();

      await service.handleWebhook(rawBody, validSignature);

      expect(mockTransactionService.transactionByReference).toHaveBeenCalledWith(
        'PAY_123',
      );
      expect(mockWalletService.creditBalance).not.toHaveBeenCalled();
      expect(mockTransactionService.updateTransaction).not.toHaveBeenCalled();
    });
  });
});
