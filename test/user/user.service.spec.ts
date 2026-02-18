import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserService } from '../../src/user/user.service';
import { User, UserRole } from '../../src/entities/user.entity';
import { CreateUserDto } from '../../src/user/dto/create-user.dto';
import { UpdateUserDto } from '../../src/user/dto/update-user.dto';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;

  const mockUser: Partial<User> = {
    id: 'uuid-1',
    phone: '+2348012345678',
    passwordHash: 'hashed',
    role: UserRole.USER,
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn((data) => ({ ...data })),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    const dto: CreateUserDto = {
      phone: '+2348012345678',
      password: 'password123',
    };

    it('should normalize phone, hash password, create and return user', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.createUser(dto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { phone: '+2348012345678' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(mockRepository.create).toHaveBeenCalledWith({
        phone: '+2348012345678',
        passwordHash: 'hashed',
        role: UserRole.USER,
      });
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
    });

    it('should normalize 0-prefix phone to +234 before storing', async () => {
      const dtoWithZeroPrefix: CreateUserDto = {
        phone: '08012345678',
        password: 'password123',
      };
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(mockUser);

      await service.createUser(dtoWithZeroPrefix);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { phone: '+2348012345678' },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+2348012345678' }),
      );
    });

    it('should throw ConflictException when phone already exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException);
      await expect(service.createUser(dto)).rejects.toThrow(
        'User with phone +2348012345678 already exists',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when duplicate phone in different format (0801 vs +234801)', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const dtoWithZeroPrefix: CreateUserDto = {
        phone: '08012345678',
        password: 'password123',
      };

      await expect(service.createUser(dtoWithZeroPrefix)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserById('uuid-1');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findUserByIdOrFail', () => {
    it('should return user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserByIdOrFail('uuid-1');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findUserByIdOrFail('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findUserByIdOrFail('non-existent')).rejects.toThrow(
        'User with id non-existent not found',
      );
    });
  });

  describe('findUserByPhone', () => {
    it('should return user when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserByPhone('+2348012345678');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { phone: '+2348012345678' },
      });
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findUserByPhone('+2340000000000');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    const dto: UpdateUserDto = { phone: '+2348098765432' };
    const updatedUser = { ...mockUser, phone: dto.phone };

    it('should update user phone and return updated user', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateUser('uuid-1', dto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { phone: '+2348098765432' },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+2348098765432' }),
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUser('non-existent', dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when phone taken by another user', async () => {
      const existingUser = { ...mockUser, id: 'uuid-2' };
      mockRepository.findOne.mockImplementation((opts: { where: { id?: string; phone?: string } }) => {
        if (opts.where.id) return Promise.resolve(mockUser);
        if (opts.where.phone) return Promise.resolve(existingUser);
        return Promise.resolve(null);
      });

      await expect(service.updateUser('uuid-1', dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.updateUser('uuid-1', dto)).rejects.toThrow(
        'User with phone +2348098765432 already exists',
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should not update phone when dto.phone is undefined', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.updateUser('uuid-1', {});

      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('deleteUser', () => {
    it('should call repository.delete with id', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteUser('uuid-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('uuid-1');
    });
  });
});
