import { Test, TestingModule } from '@nestjs/testing';
import { chainConfigJsonMock } from '../../../../../tests/mocks/chain.config.json.mock';
import { NonceControllingService } from '../NonceControllingService';
import { getEntityManagerToken } from '@nestjs/typeorm/dist/common/typeorm.utils';
import { DebrdigeApiService } from '../../../../external/debridge_api/services/DebrdigeApiService';
import { ChainScanningService } from '../ChainScanningService';
import { Web3Custom } from '../../../../web3/services/Web3Service';
import { ProcessNewTransferResultStatusEnum } from '../../enums/ProcessNewTransferResultStatusEnum';
import { ChainConfigModule } from '../../../config/ChainConfigModule';
import { NonceValidationEnum } from '../../enums/NonceValidationEnum';

jest.mock('../../../../../config/chains_config.json', () => {
  return chainConfigJsonMock;
});

const chainScanningService = {
  pause: () => {
    return;
  },
};

const debrdigeApiService = {
  notifyError: (message: string) => {
    return message;
  },
};

describe('NonceControllingService', () => {
  let service: NonceControllingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ChainConfigModule],
      providers: [
        NonceControllingService,
        {
          provide: ChainScanningService,
          useValue: chainScanningService,
        },
        {
          provide: DebrdigeApiService,
          useValue: debrdigeApiService,
        },
        {
          provide: getEntityManagerToken(),
          useValue: {
            query: async () => {
              return [
                {
                  chainFrom: 970,
                  max: 10,
                },
                {
                  chainFrom: 420,
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
    it('Test control max nonce', async () => {
      expect(service.getMaxNonce(98)).toBeUndefined();
      expect(service.getMaxNonce(970)).toBe(10);
      expect(service.getMaxNonce(420)).toBe(100);
      service.setMaxNonce(970, 11);
      expect(service.getMaxNonce(970)).toBe(11);
    });

    it('processValidationNonceError SUCCESS', async () => {
      await expect(
        service.processValidationNonceError({ status: ProcessNewTransferResultStatusEnum.SUCCESS }, 97, { chainProvider: 'test' } as Web3Custom),
      ).resolves.toBeUndefined();
    });
  });

  it('processValidationNonceError DUPLICATED_NONCE', async () => {
    jest.spyOn(debrdigeApiService, 'notifyError');
    jest.spyOn(chainScanningService, 'pause');
    const result = await service.processValidationNonceError(
      {
        nonceValidationStatus: NonceValidationEnum.DUPLICATED_NONCE,
        status: ProcessNewTransferResultStatusEnum.ERROR,
        submissionId: '123',
        nonce: 123,
      },
      970,
      { chainProvider: 'test' } as Web3Custom,
    );
    expect(debrdigeApiService.notifyError).toHaveBeenCalledWith(`incorrect nonce error (duplicated_nonce): nonce: 123; submissionId: 123`);
    expect(chainScanningService.pause).toHaveBeenCalledWith(970);

    await expect(result).toBe(NonceValidationEnum.DUPLICATED_NONCE);
  });

  it('AddNewEventsAction processValidationNonceError MISSED_NONCE', async () => {
    jest.spyOn(debrdigeApiService, 'notifyError');
    const result = await service.processValidationNonceError(
      {
        nonceValidationStatus: NonceValidationEnum.MISSED_NONCE,
        status: ProcessNewTransferResultStatusEnum.ERROR,
        submissionId: '123',
        nonce: 123,
      },
      970,
      { chainProvider: 'https://debridge.io' } as Web3Custom,
    );
    expect(debrdigeApiService.notifyError).toHaveBeenCalledWith(`incorrect nonce error (missed_nonce): nonce: 123; submissionId: 123`);

    await expect(result).toBe(NonceValidationEnum.MISSED_NONCE);
  });
});
