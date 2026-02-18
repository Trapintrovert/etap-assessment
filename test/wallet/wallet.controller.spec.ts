import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from '../../src/wallet/wallet.controller';
import { WalletService } from '../../src/wallet/wallet.service';
import { User, UserRole } from '../../src/entities/user.entity';
import { CreateWalletDto } from '../../src/wallet/dto/create-wallet.dto';

describe('WalletController', () => {
  let controller: WalletController;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    phone: '+2348012345678',
    role: UserRole.USER,
  };

  const mockWallet = {
    id: 'wallet-uuid-1',
    userId: 'user-uuid-1',
    currency: 'NGN',
    balance: '0',
  };

  const mockWalletService = {
    createWallet: jest.fn(),
    getWallets: jest.fn(),
    getWalletById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [{ provide: WalletService, useValue: mockWalletService }],
    }).compile();

    controller = module.get<WalletController>(WalletController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createWallet', () => {
    const dto: CreateWalletDto = { currency: 'NGN' };

    it('should call walletService.createWallet with user id and dto', async () => {
      mockWalletService.createWallet.mockResolvedValue(mockWallet);

      const result = await controller.createWallet(mockUser as User, dto);

      expect(mockWalletService.createWallet).toHaveBeenCalledWith(
        mockUser.id,
        dto,
      );
      expect(result).toEqual(mockWallet);
    });
  });

  describe('getWallets', () => {
    it('should call walletService.getWallets with user id', async () => {
      mockWalletService.getWallets.mockResolvedValue([mockWallet]);

      const result = await controller.getWallets(mockUser as User);

      expect(mockWalletService.getWallets).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual([mockWallet]);
    });
  });

  describe('getWallet', () => {
    it('should call walletService.getWalletById with id and user id', async () => {
      mockWalletService.getWalletById.mockResolvedValue(mockWallet);

      const result = await controller.getWallet(
        'wallet-uuid-1',
        mockUser as User,
      );

      expect(mockWalletService.getWalletById).toHaveBeenCalledWith(
        'wallet-uuid-1',
        mockUser.id,
      );
      expect(result).toEqual(mockWallet);
    });
  });
});
