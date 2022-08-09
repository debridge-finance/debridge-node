import { Test, TestingModule } from '@nestjs/testing';
import { StatisticToApiAction } from '../StatisticToApiAction';
import { DebrdigeApiService } from '../../../../external/debridge_api/services/DebrdigeApiService';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../../../../entities/SupportedChainEntity';
import { ProgressInfoDTO } from '../../../../external/debridge_api/dto/request/ValidationProgressDTO';
import { ConfigServiceSimpleMock } from '../../../../../tests/mocks/config.service.simple.mock';
import { ChainConfigService } from '../../../../chain/config/services/ChainConfigService';
import { EvmChainConfig } from '../../../../chain/config/models/configs/EvmChainConfig';

describe('StatisticToApiAction', () => {
  let service: StatisticToApiAction;
  let debrdigeApiService: DebrdigeApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        StatisticToApiAction,
        {
          provide: ConfigService,
          useClass: ConfigServiceSimpleMock,
        },
        {
          provide: ChainConfigService,
          useValue: {
            get: () => {
              return {} as EvmChainConfig;
            },
          },
        },
        {
          provide: DebrdigeApiService,
          useValue: {
            uploadStatistic: async (input: ProgressInfoDTO[]) => {
              return input;
            },
          },
        },
        {
          provide: getRepositoryToken(SupportedChainEntity),
          useValue: {
            find: async () => {
              return [
                {
                  chainId: 97,
                  network: 'test',
                  latestBlock: 10,
                },
                {
                  chainId: 42,
                  network: 'test',
                  latestBlock: 100,
                },
              ];
            },
          },
        },
      ],
    }).compile();
    service = module.get(StatisticToApiAction);
    debrdigeApiService = module.get(DebrdigeApiService);
  });

  it('test StatisticToApiAction', async () => {
    jest.spyOn(debrdigeApiService, 'uploadStatistic');
    await service.process();
    expect(debrdigeApiService.uploadStatistic).toHaveBeenCalledWith([
      {
        chainId: 97,
        lastBlock: 10,
      },
      {
        chainId: 42,
        lastBlock: 100,
      },
    ]);
  });
});
