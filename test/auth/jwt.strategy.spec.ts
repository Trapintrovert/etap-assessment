import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../../src/auth/strategies/jwt.strategy';
import { UserService } from '../../src/user/user.service';
import { User, UserRole } from '../../src/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    phone: '+2348012345678',
    role: UserRole.USER,
  };

  const mockUserService = {
    findUserById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) =>
      key === 'jwt.secret' ? 'test-secret' : undefined,
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UserService, useValue: mockUserService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user when payload is valid and user exists', async () => {
      const payload = { sub: 'user-uuid-1', phone: '+2348012345678' };
      mockUserService.findUserById.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(mockUserService.findUserById).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const payload = { sub: 'non-existent', phone: '+2348012345678' };
      mockUserService.findUserById.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserService.findUserById).toHaveBeenCalledWith('non-existent');
    });
  });
});
