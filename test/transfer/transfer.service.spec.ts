import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TransferService } from '../../src/transfer/transfer.service';
import { WalletService } from '../../src/wallet/wallet.service';
import { Transfer, TransferStatus } from '../../src/entities/transfer.entity';
import { CreateTransferDto } from '../../src/transfer/dto/create-transfer.dto';

describe('TransferService', () => {
  let service: TransferService;

  const userId = 'user-uuid-1';
  const fromWalletId = 'wallet-from-1';
  const toWalletId = 'wallet-to-1';

  const fromWallet = {
    id: fromWalletId,
    userId,
    currency: 'NGN',
    balance: '100000',
  };

  const toWallet = {
    id: toWalletId,
    userId: 'user-uuid-2',
    currency: 'NGN',
    balance: '0',
  };

  const mockTransfer = {
    id: 'transfer-uuid-1',
    fromWalletId,
    toWalletId,
    amount: '5000',
    status: TransferStatus.COMPLETED,
    initiatedById: userId,
  };

  const mockPendingTransfer = {
    ...mockTransfer,
    status: TransferStatus.PENDING_APPROVAL,
    amount: '1500000',
  };

  const mockWalletService = {
    getWalletById: jest.fn(),
    findWalletById: jest.fn(),
  };

  const mockTransferRepository = {
    create: jest.fn((data: Record<string, unknown>) => ({ ...data })),
    save: jest.fn(),
    findOneOrFail: jest.fn(),
    find: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) =>
      key === 'transfer.largeTransferThreshold' ? 1_000_000 : undefined,
    ),
  };

  const createQueryRunner = () => {
    const walletRepo = {
      findOneOrFail: jest.fn(),
      save: jest.fn(),
    };
    const transferRepo = {
      create: jest.fn((data: Record<string, unknown>) => ({ ...data })),
      save: jest.fn(),
      findOneOrFail: jest.fn(),
    };
    const transactionRepo = {
      create: jest.fn((data: Record<string, unknown>) => ({ ...data })),
      save: jest.fn(),
    };
    const getRepository = jest.fn((entity: unknown) => {
      const name = (entity as { name?: string })?.name ?? '';
      if (name === 'Wallet') return walletRepo;
      if (name === 'Transfer') return transferRepo;
      if (name === 'Transaction') return transactionRepo;
      throw new Error(`Unknown entity: ${name}`);
    });
    return {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      manager: { getRepository },
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      walletRepo,
      transferRepo,
      transactionRepo,
    };
  };

  let mockDataSource: { createQueryRunner: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockWalletService.getWalletById.mockResolvedValue({
      ...fromWallet,
      balance: '2000000',
    });
    mockWalletService.findWalletById.mockResolvedValue(toWallet);

    const qr = createQueryRunner();
    qr.walletRepo.findOneOrFail
      .mockResolvedValueOnce({ ...fromWallet, balance: '100000' })
      .mockResolvedValueOnce({ ...toWallet, balance: '0' });
    qr.walletRepo.save.mockResolvedValue([]);
    qr.transferRepo.save.mockResolvedValue(mockTransfer);
    qr.transactionRepo.save.mockResolvedValue([]);

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(qr),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        { provide: getRepositoryToken(Transfer), useValue: mockTransferRepository },
        { provide: WalletService, useValue: mockWalletService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TransferService>(TransferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTransfer', () => {
    const dto: CreateTransferDto = {
      fromWalletId,
      toWalletId,
      amount: 5000,
    };

    it('should execute transfer immediately when amount is under threshold', async () => {
      mockTransferRepository.create.mockImplementation(
        (data: Record<string, unknown>) => ({ ...data }),
      );
      mockTransferRepository.save.mockResolvedValue(mockTransfer);

      const qr = createQueryRunner();
      qr.walletRepo.findOneOrFail
        .mockResolvedValueOnce({ ...fromWallet, balance: '100000' })
        .mockResolvedValueOnce({ ...toWallet, balance: '0' });
      qr.walletRepo.save.mockResolvedValue([]);
      qr.transferRepo.save.mockResolvedValue(mockTransfer);
      qr.transactionRepo.save.mockResolvedValue([]);
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await service.createTransfer(userId, dto);

      expect(mockWalletService.getWalletById).toHaveBeenCalledWith(
        fromWalletId,
        userId,
      );
      expect(mockWalletService.findWalletById).toHaveBeenCalledWith(toWalletId);
      expect(result.status).toBe(TransferStatus.COMPLETED);
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
    });

    it('should create pending transfer when amount exceeds threshold', async () => {
      const largeDto: CreateTransferDto = {
        fromWalletId,
        toWalletId,
        amount: 1_500_000,
      };
      mockTransferRepository.save.mockResolvedValue(mockPendingTransfer);

      const result = await service.createTransfer(userId, largeDto);

      expect(result.status).toBe(TransferStatus.PENDING_APPROVAL);
      expect(result.amount).toBe('1500000');
      expect(mockTransferRepository.save).toHaveBeenCalled();
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when insufficient balance', async () => {
      mockWalletService.getWalletById.mockResolvedValue({
        ...fromWallet,
        balance: '100',
      });

      await expect(service.createTransfer(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createTransfer(userId, dto)).rejects.toThrow(
        'Insufficient balance',
      );
      expect(mockTransferRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('rejectTransfer', () => {
    it('should reject pending transfer without balance change', async () => {
      mockTransferRepository.findOneOrFail.mockResolvedValue({
        ...mockPendingTransfer,
      });
      mockTransferRepository.save.mockResolvedValue({
        ...mockPendingTransfer,
        status: TransferStatus.REJECTED,
      });

      const result = await service.rejectTransfer('transfer-uuid-1');

      expect(result.status).toBe(TransferStatus.REJECTED);
      expect(mockTransferRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransferStatus.REJECTED }),
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when transfer is not pending', async () => {
      mockTransferRepository.findOneOrFail.mockResolvedValue(mockTransfer);

      await expect(service.rejectTransfer('transfer-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.rejectTransfer('transfer-uuid-1')).rejects.toThrow(
        'Transfer is not pending approval',
      );
    });
  });

  describe('approveTransfer', () => {
    it('should approve pending transfer and update balances', async () => {
      mockTransferRepository.findOneOrFail.mockResolvedValue({
        ...mockPendingTransfer,
      });
      mockWalletService.findWalletById
        .mockResolvedValueOnce({ ...fromWallet, balance: '2000000' })
        .mockResolvedValueOnce({ ...toWallet, balance: '0' });

      const qr = createQueryRunner();
      qr.walletRepo.findOneOrFail
        .mockResolvedValueOnce({ ...fromWallet, balance: '2000000' })
        .mockResolvedValueOnce({ ...toWallet, balance: '0' });
      qr.walletRepo.save.mockResolvedValue([]);
      qr.transferRepo.findOneOrFail.mockResolvedValue(mockPendingTransfer);
      qr.transferRepo.save.mockResolvedValue({
        ...mockPendingTransfer,
        status: TransferStatus.COMPLETED,
      });
      qr.transactionRepo.save.mockResolvedValue([]);
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await service.approveTransfer(
        'transfer-uuid-1',
        'admin-uuid-1',
      );

      expect(mockTransferRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 'transfer-uuid-1' },
      });
      expect(result.status).toBe(TransferStatus.COMPLETED);
    });

    it('should throw BadRequestException when transfer is not pending', async () => {
      mockTransferRepository.findOneOrFail.mockResolvedValue(mockTransfer);

      await expect(
        service.approveTransfer('transfer-uuid-1', 'admin-uuid-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.approveTransfer('transfer-uuid-1', 'admin-uuid-1'),
      ).rejects.toThrow('Transfer is not pending approval');
    });
  });

  describe('allPendingTransfers', () => {
    it('should return list of pending transfers', async () => {
      mockTransferRepository.find.mockResolvedValue([mockPendingTransfer]);

      const result = await service.allPendingTransfers();

      expect(mockTransferRepository.find).toHaveBeenCalledWith({
        where: { status: TransferStatus.PENDING_APPROVAL },
      });
      expect(result).toEqual([mockPendingTransfer]);
    });
  });
});
