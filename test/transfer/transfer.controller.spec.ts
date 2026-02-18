import { Test, TestingModule } from '@nestjs/testing';
import { TransferController } from '../../src/transfer/transfer.controller';
import { TransferService } from '../../src/transfer/transfer.service';

describe('TransferController', () => {
  let controller: TransferController;

  const mockTransferService = {
    createTransfer: jest.fn(),
    allPendingTransfers: jest.fn(),
    approveTransfer: jest.fn(),
    rejectTransfer: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [{ provide: TransferService, useValue: mockTransferService }],
    }).compile();

    controller = module.get<TransferController>(TransferController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
