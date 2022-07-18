import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule } from '@nestjs/schedule';
import { ChainScanStatus } from '../../../../../enums/ChainScanStatus';
import { chainConfigJsonMock } from '../../../../../tests/mocks/chain.config.json.mock';
import { AddNewEventsAction } from '../AddNewEventsAction';
import { ChainConfigService } from '../../../config/services/ChainConfigService';
import { ChainScanningService } from '../ChainScanningService';

jest.mock('../../../../../config/chains_config.json', () => {
  return chainConfigJsonMock;
});

describe('ChainScanningService', () => {
  let service: ChainScanningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        {
          provide: AddNewEventsAction,
          useValue: {
            action: async chainId => {
              return chainId;
            },
          },
        },
        ChainScanningService,
        ChainConfigService,
      ],
    }).compile();
    service = module.get(ChainScanningService);
  });

  describe('ChainScanningService', () => {
    it('Test ChainScanningService', async () => {
      expect(service.status(970)).toBe(ChainScanStatus.PAUSE);
      service.start(970);
      expect(service.status(970)).toBe(ChainScanStatus.IN_PROGRESS);
      service.pause(970);
      expect(service.status(970)).toBe(ChainScanStatus.PAUSE);
      service.start(970);
      expect(service.status(970)).toBe(ChainScanStatus.IN_PROGRESS);
      service.pause(970);
      expect(service.status(970)).toBe(ChainScanStatus.PAUSE);
    });
  });
});
