import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from '../../src/transaction/transaction.controller';
import { TransactionService } from '../../src/transaction/transaction.service';
import { WalletService } from '../../src/wallet/wallet.service';
import {
  TransactionStatus,
  TransactionType,
} from '../../src/entities/transaction.entity';
import { User, UserRole } from '../../src/entities/user.entity';

describe('TransactionController', () => {
  let controller: TransactionController;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    phone: '+2348012345678',
    role: UserRole.USER,
  };

  const mockTransaction = {
    id: 'tx-uuid-1',
    walletId: 'wallet-uuid-1',
    type: TransactionType.CREDIT,
    amount: '5000',
    reference: 'PAY_123',
    status: TransactionStatus.COMPLETED,
  };

  const mockTransactionService = {
    allTransactions: jest.fn(),
    getMonthlySummary: jest.fn(),
    findTransactionByIdOrFail: jest.fn(),
    transactionByReferenceOrFail: jest.fn(),
    transactionsByUserId: jest.fn(),
    transactionsByWalletIdOrFail: jest.fn(),
  };

  const mockWalletService = {
    getWalletById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('allTransactions', () => {
    it('should call transactionService.allTransactions and return result', async () => {
      mockTransactionService.allTransactions.mockResolvedValue([
        mockTransaction,
      ]);

      const result = await controller.allTransactions();

      expect(mockTransactionService.allTransactions).toHaveBeenCalledWith();
      expect(result).toEqual([mockTransaction]);
    });
  });

  describe('getMonthlySummary', () => {
    it('should call transactionService.getMonthlySummary with year and month', async () => {
      const mockSummary = {
        year: 2025,
        month: 1,
        totalCount: 10,
        totalAmount: '25000.50',
        byType: {},
        byCurrency: {},
      };
      mockTransactionService.getMonthlySummary.mockResolvedValue(mockSummary);

      const result = await controller.getMonthlySummary({
        year: 2025,
        month: 1,
      });

      expect(mockTransactionService.getMonthlySummary).toHaveBeenCalledWith(
        2025,
        1,
      );
      expect(result).toEqual(mockSummary);
    });
  });

  describe('transactionById', () => {
    it('should return transaction when user owns wallet', async () => {
      mockTransactionService.findTransactionByIdOrFail.mockResolvedValue(
        mockTransaction,
      );
      mockWalletService.getWalletById.mockResolvedValue({});

      const result = await controller.transactionById(
        'tx-uuid-1',
        mockUser as User,
      );

      expect(
        mockTransactionService.findTransactionByIdOrFail,
      ).toHaveBeenCalledWith('tx-uuid-1');
      expect(mockWalletService.getWalletById).toHaveBeenCalledWith(
        'wallet-uuid-1',
        mockUser.id,
      );
      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      mockTransactionService.findTransactionByIdOrFail.mockRejectedValue(
        new NotFoundException('Transaction with id non-existent not found'),
      );

      await expect(
        controller.transactionById('non-existent', mockUser as User),
      ).rejects.toThrow(NotFoundException);
      expect(mockWalletService.getWalletById).not.toHaveBeenCalled();
    });
  });

  describe('transactionByReference', () => {
    it('should return transaction when user owns wallet', async () => {
      mockTransactionService.transactionByReferenceOrFail.mockResolvedValue(
        mockTransaction,
      );
      mockWalletService.getWalletById.mockResolvedValue({});

      const result = await controller.transactionByReference(
        'PAY_123',
        mockUser as User,
      );

      expect(
        mockTransactionService.transactionByReferenceOrFail,
      ).toHaveBeenCalledWith('PAY_123');
      expect(mockWalletService.getWalletById).toHaveBeenCalledWith(
        'wallet-uuid-1',
        mockUser.id,
      );
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('transactionsByUserId', () => {
    it('should return transactions when userId matches current user', async () => {
      mockTransactionService.transactionsByUserId.mockResolvedValue([
        mockTransaction,
      ]);

      const result = await controller.transactionsByUserId(
        mockUser.id!,
        mockUser as User,
      );

      expect(mockTransactionService.transactionsByUserId).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(result).toEqual([mockTransaction]);
    });

    it('should throw ForbiddenException when userId does not match current user', async () => {
      await expect(
        controller.transactionsByUserId('other-user-uuid', mockUser as User),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.transactionsByUserId('other-user-uuid', mockUser as User),
      ).rejects.toThrow('You can only list your own transactions');
      expect(
        mockTransactionService.transactionsByUserId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('transactionsByWalletId', () => {
    it('should return transactions when user owns wallet', async () => {
      mockWalletService.getWalletById.mockResolvedValue({});
      mockTransactionService.transactionsByWalletIdOrFail.mockResolvedValue([
        mockTransaction,
      ]);

      const result = await controller.transactionsByWalletId(
        'wallet-uuid-1',
        mockUser as User,
      );

      expect(mockWalletService.getWalletById).toHaveBeenCalledWith(
        'wallet-uuid-1',
        mockUser.id,
      );
      expect(
        mockTransactionService.transactionsByWalletIdOrFail,
      ).toHaveBeenCalledWith('wallet-uuid-1');
      expect(result).toEqual([mockTransaction]);
    });

    it('should throw NotFoundException when no transactions for wallet', async () => {
      mockWalletService.getWalletById.mockResolvedValue({});
      mockTransactionService.transactionsByWalletIdOrFail.mockRejectedValue(
        new NotFoundException('No transactions found for wallet wallet-uuid-1'),
      );

      await expect(
        controller.transactionsByWalletId('wallet-uuid-1', mockUser as User),
      ).rejects.toThrow(NotFoundException);
      expect(mockWalletService.getWalletById).toHaveBeenCalledWith(
        'wallet-uuid-1',
        mockUser.id,
      );
    });
  });
});
