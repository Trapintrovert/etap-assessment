import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Wallet } from '../../src/entities/wallet.entity';
import { WalletService } from '../../src/wallet/wallet.service';
import { UserService } from '../../src/user/user.service';
import { CreateWalletDto } from '../../src/wallet/dto/create-wallet.dto';

describe('WalletService', () => {
  let service: WalletService;

  const mockWallet: Partial<Wallet> = {
    id: 'wallet-uuid-1',
    userId: 'user-uuid-1',
    currency: 'NGN',
    balance: '0',
  };

  const mockWalletRepository = {
    findOne: jest.fn(),
    create: jest.fn((data) => ({ ...data })),
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockUserService = {
    findUserByIdOrFail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(Wallet), useValue: mockWalletRepository },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWallet', () => {
    const userId = 'user-uuid-1';
    const dto: CreateWalletDto = { currency: 'NGN' };

    it('should create and return wallet', async () => {
      mockUserService.findUserByIdOrFail.mockResolvedValue({});
      mockWalletRepository.findOne.mockResolvedValue(null);
      mockWalletRepository.save.mockResolvedValue(mockWallet);

      const result = await service.createWallet(userId, dto);

      expect(mockUserService.findUserByIdOrFail).toHaveBeenCalledWith(userId);
      expect(mockWalletRepository.findOne).toHaveBeenCalledWith({
        where: { userId, currency: 'NGN' },
      });
      expect(mockWalletRepository.create).toHaveBeenCalledWith({
        userId,
        currency: 'NGN',
        balance: '0',
      });
      expect(mockWalletRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWallet);
    });

    it('should normalize currency to uppercase', async () => {
      mockUserService.findUserByIdOrFail.mockResolvedValue({});
      mockWalletRepository.findOne.mockResolvedValue(null);
      mockWalletRepository.save.mockResolvedValue(mockWallet);

      await service.createWallet(userId, { currency: 'ngn' });

      expect(mockWalletRepository.findOne).toHaveBeenCalledWith({
        where: { userId, currency: 'NGN' },
      });
      expect(mockWalletRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'NGN' }),
      );
    });

    it('should throw ConflictException when wallet with currency exists', async () => {
      mockUserService.findUserByIdOrFail.mockResolvedValue({});
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);

      await expect(service.createWallet(userId, dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createWallet(userId, dto)).rejects.toThrow(
        'Wallet with currency NGN already exists for this user',
      );
      expect(mockWalletRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserService.findUserByIdOrFail.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(service.createWallet(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getWallets', () => {
    it('should return array of wallets for user', async () => {
      const wallets = [mockWallet];
      mockWalletRepository.find.mockResolvedValue(wallets);

      const result = await service.getWallets('user-uuid-1');

      expect(mockWalletRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
      });
      expect(result).toEqual(wallets);
    });
  });

  describe('getWalletById', () => {
    it('should return wallet when user owns it', async () => {
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);

      const result = await service.getWalletById(
        'wallet-uuid-1',
        'user-uuid-1',
      );

      expect(result).toEqual(mockWallet);
    });

    it('should throw NotFoundException when wallet not found', async () => {
      mockWalletRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getWalletById('non-existent', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getWalletById('non-existent', 'user-uuid-1'),
      ).rejects.toThrow('Wallet with id non-existent not found');
    });

    it('should throw ForbiddenException when user does not own wallet', async () => {
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);

      await expect(
        service.getWalletById('wallet-uuid-1', 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getWalletById('wallet-uuid-1', 'other-user-id'),
      ).rejects.toThrow('You do not have access to this wallet');
    });
  });
});
