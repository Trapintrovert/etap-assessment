import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../../src/user/user.controller';
import { UserService } from '../../src/user/user.service';
import { User, UserRole } from '../../src/entities/user.entity';

describe('UserController', () => {
  let controller: UserController;

  const mockUser: Partial<User> = {
    id: 'uuid-1',
    phone: '+2348012345678',
    role: UserRole.USER,
  };

  const mockUserService = {
    createUser: jest.fn(),
    findUserByIdOrFail: jest.fn(),
    allUsers: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateProfile', () => {
    it('should call userService.updateUser and return updated user', async () => {
      const id = 'uuid-1';
      const dto = { phone: '+2348098765432' };
      const updatedUser = { ...mockUser, phone: dto.phone };
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(id, dto);

      expect(mockUserService.updateUser).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should call userService.deleteUser with id', async () => {
      const id = 'uuid-1';
      mockUserService.deleteUser.mockResolvedValue(undefined);

      await controller.deleteUser(id);

      expect(mockUserService.deleteUser).toHaveBeenCalledWith(id);
    });
  });
});
