import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleModule } from '@nestjs/schedule';
import { ChainConfigService } from '../ChainConfigService';
import { ChainProvider } from '../../models/ChainProvider';
import { EvmChainConfig } from '../../models/configs/EvmChainConfig';
import { chainConfigJsonMock } from '../../../../../tests/mocks/chain.config.json.mock';

jest.mock('../../../../../config/chains_config.json', () => {
  return chainConfigJsonMock;
});

describe('ChainConfigService', () => {
  let service: ChainConfigService;
  let chainProvider: ChainProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [ChainConfigService],
    }).compile();
    service = module.get(ChainConfigService);
    chainProvider = (service.get(970) as EvmChainConfig).providers;
  });

  describe('ChainConfigService', () => {
    describe('ChainProvider', () => {
      it('getChainId', async () => {
        expect(chainProvider.getChainId()).toEqual(970);
      });

      it('size', async () => {
        expect(chainProvider.size()).toEqual(1);
      });

      it('getChainAuth', async () => {
        expect(chainProvider.getChainAuth('https://debridge.io')).toBeUndefined();
        const authChainProvider = (service.get(972) as EvmChainConfig).providers;
        expect(authChainProvider.getChainAuth('debridge.io')).toEqual([{ name: 'Authorization', value: 'Basic YW50b246MTIz' }]);
      });

      it('getAllProviders', async () => {
        expect(chainProvider.getAllProviders()).toEqual(['https://debridge.io']);
      });

      it('getNotFailedProviders', async () => {
        chainProvider.setProviderStatus('https://debridge.io', true);
        chainProvider.setProviderValidationStatus('https://debridge.io', true);
        expect(chainProvider.getNotFailedProviders()).toEqual(['https://debridge.io']);
        chainProvider.setProviderStatus('https://debridge.io', false);
        expect(chainProvider.getNotFailedProviders()).toEqual([]);
        chainProvider.setProviderValidationStatus('https://debridge.io', false);
        expect(chainProvider.getNotFailedProviders()).toEqual([]);
      });

      it('getFailedProviders', async () => {
        chainProvider.setProviderStatus('https://debridge.io', false);
        expect(chainProvider.getFailedProviders()).toEqual(['https://debridge.io']);
        chainProvider.setProviderStatus('https://debridge.io', true);
        expect(chainProvider.getFailedProviders()).toEqual([]);
        chainProvider.setProviderStatus('https://debridge.io', false);
      });

      it('getProviderValidationStatus', async () => {
        chainProvider.setProviderValidationStatus('https://debridge.io', true);
        expect(chainProvider.getProviderValidationStatus('https://debridge.io')).toBe(true);
        chainProvider.setProviderValidationStatus('https://debridge.io', false);
        expect(chainProvider.getProviderValidationStatus('https://debridge.io')).toBe(false);
      });

      it('getProviderStatus', async () => {
        chainProvider.setProviderStatus('https://debridge.io', true);
        expect(chainProvider.getProviderStatus('https://debridge.io')).toBe(true);
        chainProvider.setProviderStatus('https://debridge.io', false);
        expect(chainProvider.getProviderStatus('https://debridge.io')).toBe(false);
      });
    });

    describe('ChainConfigService', () => {
      it('gets', async () => {
        expect(service.getChains()).toEqual([7565164, 970, 971, 972]);
      });

      it('getChains', async () => {
        const configs = JSON.stringify(service.getChains().map(chain => service.get(chain)));
        expect(configs).toEqual(
          `[{"chainId":7565164,"name":"SOLANA","interval":10000,"isSolana":true},{"chainId":970,"name":"ETHEREUM","debridgeAddr":"0x43dE2d77BF8027e25dBD179B491e8d64f38398aA","firstStartBlock":13665321,"providers":{"providerList":[{"provider":"https://debridge.io","isValid":false,"isActive":true,"authType":"NONE"}],"chainId":970,"providers":{}},"interval":10000,"blockConfirmation":12,"maxBlockRange":5000,"isSolana":false},{"chainId":971,"name":"ETHEREUM","debridgeAddr":"0x43dE2d77BF8027e25dBD179B491e8d64f38398aA","firstStartBlock":13665321,"providers":{"providerList":[{"provider":"https://debridge.io","isValid":false,"isActive":true,"authType":"NONE"}],"chainId":971,"providers":{}},"interval":10000,"blockConfirmation":12,"maxBlockRange":5000,"isSolana":false},{"chainId":972,"name":"ETHEREUM","debridgeAddr":"0x43dE2d77BF8027e25dBD179B491e8d64f38398aA","firstStartBlock":13665321,"providers":{"providerList":[{"isValid":false,"isActive":true,"provider":"debridge.io","user":"anton","password":"123","authType":"BASIC"}],"chainId":972,"providers":{}},"interval":10000,"blockConfirmation":12,"maxBlockRange":5000,"isSolana":false}]`,
        );
      });

      it('getConfig', async () => {
        expect(service.getConfig()).toEqual([
          {
            chainId: 7565164,
            name: 'SOLANA',
            debridgeAddr: '',
            firstStartBlock: 0,
            provider: '',
            interval: 10000,
            blockConfirmation: 30,
            maxBlockRange: 100,
          },
          {
            chainId: 970,
            name: 'ETHEREUM',
            debridgeAddr: '0x43dE2d77BF8027e25dBD179B491e8d64f38398aA',
            firstStartBlock: 13665321,
            provider: 'https://debridge.io',
            interval: 10000,
            blockConfirmation: 12,
            maxBlockRange: 5000,
          },
          {
            chainId: 971,
            name: 'ETHEREUM',
            debridgeAddr: '0x43dE2d77BF8027e25dBD179B491e8d64f38398aA',
            firstStartBlock: 13665321,
            providers: ['https://debridge.io'],
            interval: 10000,
            blockConfirmation: 12,
            maxBlockRange: 5000,
          },
          {
            chainId: 972,
            name: 'ETHEREUM',
            debridgeAddr: '0x43dE2d77BF8027e25dBD179B491e8d64f38398aA',
            firstStartBlock: 13665321,
            providers: [
              {
                provider: 'debridge.io',
                user: 'anton',
                password: '123',
                authType: 'BASIC',
                isValid: false,
                isActive: true,
              },
            ],
            interval: 10000,
            blockConfirmation: 12,
            maxBlockRange: 5000,
          },
        ]);
      });
    });
  });
});
