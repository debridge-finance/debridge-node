import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BundlrService } from './bundlr.service';

const createTransactionMock = jest.fn().mockImplementation(async () => {
  return {
    id: 'id',
    sign: jest.fn().mockImplementation(async () => {
      return;
    }),
    upload: jest.fn().mockImplementation(async () => {
      return;
    }),
  };
});

jest.mock('@bundlr-network/client', () => {
  return class {
    createTransaction = createTransactionMock;
  };
});

describe('BundlrService', () => {
  let service: BundlrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [BundlrService],
    }).compile();
    service = module.get(BundlrService);
  });

  it('Upload', async () => {
    const id = await service.upload('test');
    expect(createTransactionMock).toHaveBeenCalledWith('test');
    expect(id).toBe('id');
  });
});
