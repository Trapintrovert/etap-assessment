import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from '../../src/payment/payment.controller';
import { PaymentService } from '../../src/payment/payment.service';
import { User, UserRole } from '../../src/entities/user.entity';
import { CreatePaymentDto } from '../../src/payment/dto/create-payment.dto';

describe('PaymentController', () => {
  let controller: PaymentController;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    phone: '+2348012345678',
    role: UserRole.USER,
  };

  const mockPaymentResult = {
    authorization_url: 'https://checkout.paystack.com/xxx',
    access_code: 'abc123',
    reference: 'ref_xyz',
  };

  const mockPaymentService = {
    createPayment: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPaymentService.createPayment.mockResolvedValue(mockPaymentResult);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: mockPaymentService }],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initializePayment', () => {
    const dto: CreatePaymentDto = { walletId: 'wallet-uuid-1', amount: 5000 };

    it('should call paymentService.createPayment with user id and dto', async () => {
      const result = await controller.initializePayment(mockUser as User, dto);

      expect(mockPaymentService.createPayment).toHaveBeenCalledWith(
        mockUser.id,
        dto,
      );
      expect(result).toEqual(mockPaymentResult);
    });
  });
});
