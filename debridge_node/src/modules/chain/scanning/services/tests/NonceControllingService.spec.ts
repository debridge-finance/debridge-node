import { Test, TestingModule } from '@nestjs/testing';
import { NonceControllingService } from '../NonceControllingService';
import { getEntityManagerToken } from '@nestjs/typeorm/dist/common/typeorm.utils';
import { DebrdigeApiService } from '../../../../external/debridge_api/services/DebrdigeApiService';
import { ChainScanningService } from '../ChainScanningService';

describe('NonceControllingService', () => {
  let service: NonceControllingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NonceControllingService,
        {
          provide: DebrdigeApiService,
          useValue: {
            notifyError: jest.fn(),
          },
        },
        {
          provide: ChainScanningService,
          useValue: {
            pause: jest.fn(),
          },
        },
        {
          provide: getEntityManagerToken(),
          useValue: {
            query: async () => {
              return [
                {
                  chainFrom: 97,
                  max: 10,
                },
                {
                  chainFrom: 42,
                  max: 100,
                },
              ];
            },
          },
        },
      ],
    }).compile();
    service = module.get(NonceControllingService);
    await service.onModuleInit();
  });

  describe('NonceControllingService', () => {
    it('Test NonceControllingService', async () => {
      expect(service.getMaxNonce(98)).toBeUndefined();
      expect(service.getMaxNonce(97)).toBe(10);
      expect(service.getMaxNonce(42)).toBe(100);
      service.setMaxNonce(97, 11);
      expect(service.getMaxNonce(97)).toBe(11);
    });
  });
});
