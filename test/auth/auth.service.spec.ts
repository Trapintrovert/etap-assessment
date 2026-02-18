import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../src/entities/user.entity';
import { CreateUserDto } from '../../src/user/dto/create-user.dto';
import { UserService } from '../../src/user/user.service';
import { AuthService } from '../../src/auth/auth.service';
import { LoginDto } from '../../src/auth/dto/login.dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUser: Partial<User> = {
    id: 'uuid-1',
    phone: '+2348012345678',
    passwordHash: 'hashed',
    role: UserRole.USER,
  };

  const mockUserService = {
    createUser: jest.fn(),
    findUserByPhone: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('jwt-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto: CreateUserDto = {
      phone: '+2348012345678',
      password: 'password123',
    };

    it('should create user and return user with accessToken', async () => {
      mockUserService.createUser.mockResolvedValue(mockUser);

      const result = await service.register(dto);

      expect(mockUserService.createUser).toHaveBeenCalledWith(dto);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        phone: mockUser.phone,
      });
      expect(result).toEqual({
        user: mockUser,
        accessToken: 'jwt-token',
      });
    });

    it('should throw ConflictException when phone already exists', async () => {
      mockUserService.createUser.mockRejectedValue(
        new ConflictException('User with phone +2348012345678 already exists'),
      );

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      await expect(service.register(dto)).rejects.toThrow(
        'User with phone +2348012345678 already exists',
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      phone: '+2348012345678',
      password: 'password123',
    };

    it('should return user with accessToken when credentials are valid', async () => {
      mockUserService.findUserByPhone.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(mockUserService.findUserByPhone).toHaveBeenCalledWith(
        '+2348012345678',
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        dto.password,
        mockUser.passwordHash,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        phone: mockUser.phone,
      });
      expect(result).toEqual({
        user: mockUser,
        accessToken: 'jwt-token',
      });
    });

    it('should normalize phone before lookup', async () => {
      const dtoWithZeroPrefix: LoginDto = {
        phone: '08012345678',
        password: 'password123',
      };
      mockUserService.findUserByPhone.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login(dtoWithZeroPrefix);

      expect(mockUserService.findUserByPhone).toHaveBeenCalledWith(
        '+2348012345678',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserService.findUserByPhone.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockUserService.findUserByPhone.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });
});
