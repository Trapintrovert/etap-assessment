import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { UserRole } from '../../src/entities/user.entity';
import { CreateUserDto } from '../../src/user/dto/create-user.dto';
import { LoginDto } from '../../src/auth/dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;

  const mockUser = {
    id: 'uuid-1',
    phone: '+2348012345678',
    role: UserRole.USER,
  };

  const mockAuthResponse = {
    user: mockUser,
    accessToken: 'jwt-token',
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const dto: CreateUserDto = {
      phone: '+2348012345678',
      password: 'password123',
    };

    it('should call authService.register and return user with accessToken', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      phone: '+2348012345678',
      password: 'password123',
    };

    it('should call authService.login and return user with accessToken', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });
});
