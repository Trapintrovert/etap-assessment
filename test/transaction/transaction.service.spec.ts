import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../src/entities/transaction.entity';
import { TransactionService } from '../../src/transaction/transaction.service';
import { UserService } from '../../src/user/user.service';
import { WalletService } from '../../src/wallet/wallet.service';
import { CreateTransactionDto } from '../../src/transaction/dto/create-transaction.dto';
import { UpdateTransactionDto } from '../../src/transaction/dto/update-transaction.dto';

describe('TransactionService', () => {
  let service: TransactionService;

  const mockTransaction = {
    id: 'tx-uuid-1',
    walletId: 'wallet-uuid-1',
    type: TransactionType.CREDIT,
    amount: '5000',
    reference: 'PAY_123',
    status: TransactionStatus.COMPLETED,
  };

  const mockTransactionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data) => ({ ...data })),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockTransaction]),
    })),
  };

  const mockWalletService = {
    getWalletById: jest.fn(),
  };

  const mockUserService = {
    findUserByIdOrFail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTransactionRepository.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockTransaction]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        { provide: WalletService, useValue: mockWalletService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTransaction', () => {
    const userId = 'user-uuid-1';
    const dto: CreateTransactionDto = {
      type: TransactionType.CREDIT,
      walletId: 'wallet-uuid-1',
      amount: 5000,
      reference: 'PAY_123',
      status: TransactionStatus.PENDING,
    };

    it('should create and return transaction', async () => {
      mockWalletService.getWalletById.mockResolvedValue({});
      mockTransactionRepository.save.mockResolvedValue(mockTransaction);

      const result = await service.createTransaction(userId, dto);

      expect(mockWalletService.getWalletById).toHaveBeenCalledWith(
        dto.walletId,
        userId,
      );
      expect(mockTransactionRepository.create).toHaveBeenCalledWith({
        type: dto.type,
        walletId: dto.walletId,
        amount: '5000',
        reference: dto.reference,
        metadata: null,
        status: dto.status,
        transferId: null,
      });
      expect(mockTransactionRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTransaction);
    });

    it('should use default status COMPLETED when not provided', async () => {
      mockWalletService.getWalletById.mockResolvedValue({});
      mockTransactionRepository.save.mockResolvedValue(mockTransaction);

      await service.createTransaction(userId, {
        ...dto,
        status: undefined,
      });

      expect(mockTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.COMPLETED }),
      );
    });

    it('should throw when wallet does not belong to user', async () => {
      mockWalletService.getWalletById.mockRejectedValue(
        new NotFoundException('Wallet not found'),
      );

      await expect(service.createTransaction(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findTransactionById', () => {
    it('should return transaction when found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findTransactionById('tx-uuid-1');

      expect(mockTransactionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tx-uuid-1' },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should return null when not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      const result = await service.findTransactionById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findTransactionByIdOrFail', () => {
    it('should return transaction when found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findTransactionByIdOrFail('tx-uuid-1');

      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException when not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findTransactionByIdOrFail('non-existent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findTransactionByIdOrFail('non-existent'),
      ).rejects.toThrow('Transaction with id non-existent not found');
    });
  });

  describe('allTransactions', () => {
    it('should return all transactions', async () => {
      const transactions = [mockTransaction];
      mockTransactionRepository.find.mockResolvedValue(transactions);

      const result = await service.allTransactions();

      expect(mockTransactionRepository.find).toHaveBeenCalledWith();
      expect(result).toEqual(transactions);
    });
  });

  describe('updateTransaction', () => {
    it('should update and return transaction', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);
      mockTransactionRepository.save.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.FAILED,
      });

      const updates: UpdateTransactionDto = {
        status: TransactionStatus.FAILED,
      };
      await service.updateTransaction('tx-uuid-1', updates);

      expect(mockTransactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.FAILED }),
      );
    });

    it('should throw NotFoundException when transaction not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateTransaction('non-existent', {
          status: TransactionStatus.FAILED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transactionByReference', () => {
    it('should return transaction when found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.transactionByReference('PAY_123');

      expect(mockTransactionRepository.findOne).toHaveBeenCalledWith({
        where: { reference: 'PAY_123' },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should return null when not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      const result = await service.transactionByReference('invalid');

      expect(result).toBeNull();
    });
  });

  describe('transactionByReferenceOrFail', () => {
    it('should return transaction when found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.transactionByReferenceOrFail('PAY_123');

      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException when not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.transactionByReferenceOrFail('invalid'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.transactionByReferenceOrFail('invalid'),
      ).rejects.toThrow('Transaction with reference invalid not found');
    });
  });

  describe('transactionsByWalletId', () => {
    it('should return transactions for wallet', async () => {
      const transactions = [mockTransaction];
      mockTransactionRepository.find.mockResolvedValue(transactions);

      const result = await service.transactionsByWalletId('wallet-uuid-1');

      expect(mockTransactionRepository.find).toHaveBeenCalledWith({
        where: { walletId: 'wallet-uuid-1' },
      });
      expect(result).toEqual(transactions);
    });
  });

  describe('transactionsByUserId', () => {
    it('should return transactions for user', async () => {
      mockUserService.findUserByIdOrFail.mockResolvedValue({});

      const result = await service.transactionsByUserId('user-uuid-1');

      expect(mockUserService.findUserByIdOrFail).toHaveBeenCalledWith(
        'user-uuid-1',
      );
      expect(mockTransactionRepository.createQueryBuilder).toHaveBeenCalledWith(
        't',
      );
      expect(result).toEqual([mockTransaction]);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserService.findUserByIdOrFail.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        service.transactionsByUserId('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transactionsByWalletIdOrFail', () => {
    it('should return transactions when found', async () => {
      const transactions = [mockTransaction];
      mockTransactionRepository.find.mockResolvedValue(transactions);

      const result =
        await service.transactionsByWalletIdOrFail('wallet-uuid-1');

      expect(result).toEqual(transactions);
    });

    it('should throw NotFoundException when no transactions found', async () => {
      mockTransactionRepository.find.mockResolvedValue([]);

      await expect(
        service.transactionsByWalletIdOrFail('wallet-uuid-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.transactionsByWalletIdOrFail('wallet-uuid-1'),
      ).rejects.toThrow('No transactions found for wallet wallet-uuid-1');
    });
  });

  describe('getMonthlySummary', () => {
    it('should return aggregated totals and breakdown by type and currency', async () => {
      const chain = (getRaw: () => Promise<unknown>) => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getRawOne: jest.fn().mockImplementation(getRaw),
        getRawMany: jest.fn().mockImplementation(getRaw),
      });

      mockTransactionRepository.createQueryBuilder
        .mockReturnValueOnce(
          chain(() =>
            Promise.resolve({ count: '10', totalAmount: '25000.50' }),
          ) as ReturnType<typeof mockTransactionRepository.createQueryBuilder>,
        )
        .mockReturnValueOnce(
          chain(() =>
            Promise.resolve([
              {
                type: TransactionType.CREDIT,
                count: '6',
                totalAmount: '15000.00',
              },
              {
                type: TransactionType.TRANSFER_IN,
                count: '2',
                totalAmount: '5000.25',
              },
              {
                type: TransactionType.TRANSFER_OUT,
                count: '2',
                totalAmount: '5000.25',
              },
            ]),
          ) as ReturnType<typeof mockTransactionRepository.createQueryBuilder>,
        )
        .mockReturnValueOnce(
          chain(() =>
            Promise.resolve([
              { currency: 'NGN', count: '8', totalAmount: '20000.00' },
              { currency: 'USD', count: '2', totalAmount: '5000.50' },
            ]),
          ) as ReturnType<typeof mockTransactionRepository.createQueryBuilder>,
        );

      const result = await service.getMonthlySummary(2025, 1);

      expect(result).toEqual({
        year: 2025,
        month: 1,
        totalCount: 10,
        totalAmount: '25000.50',
        byType: {
          [TransactionType.CREDIT]: {
            count: 6,
            totalAmount: '15000.00',
          },
          [TransactionType.TRANSFER_IN]: {
            count: 2,
            totalAmount: '5000.25',
          },
          [TransactionType.TRANSFER_OUT]: {
            count: 2,
            totalAmount: '5000.25',
          },
        },
        byCurrency: {
          NGN: { count: 8, totalAmount: '20000.00' },
          USD: { count: 2, totalAmount: '5000.50' },
        },
      });
    });
  });
});
