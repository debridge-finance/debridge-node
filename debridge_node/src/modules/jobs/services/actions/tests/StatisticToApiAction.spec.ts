import { Test, TestingModule } from '@nestjs/testing';
import { StatisticToApiAction } from '../StatisticToApiAction';
import { DebrdigeApiService } from '../../../../external/debridge_api/services/DebrdigeApiService';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../../../../entities/SupportedChainEntity';
import { ProgressInfoDTO } from '../../../../external/debridge_api/dto/request/ValidationProgressDTO';
import { ChainConfigService } from '../../../../chain/config/services/ChainConfigService';

jest.mock('../../../../../config/chains_config.json', () => {
  return [
    {
      chainId: 97,
      name: 'ETHEREUM',
      debridgeAddr: '0x43dE2d77BF8027e25dBD179B491e8d64f38398aA',
      firstStartBlock: 13665321,
      provider: 'https://debridge.io',
      interval: 10000,
      blockConfirmation: 12,
      maxBlockRange: 5000,
    },
    {
      chainId: 42,
      name: 'ETHEREUM',
      debridgeAddr: '0x43dE2d77BF8027e25dBD179B491e8d64f38398aA',
      firstStartBlock: 13665321,
      provider: 'https://debridge.io',
      interval: 10000,
      blockConfirmation: 12,
      maxBlockRange: 5000,
    },
  ];
});

describe('StatisticToApiAction', () => {
  let service: StatisticToApiAction;
  let debrdigeApiService: DebrdigeApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, HttpModule],
      providers: [
        StatisticToApiAction,
        ChainConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test'),
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
