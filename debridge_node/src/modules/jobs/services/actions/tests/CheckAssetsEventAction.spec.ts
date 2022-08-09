import { chainConfigJsonMock } from '../../../../../tests/mocks/chain.config.json.mock';

process.env.KEYSTORE_PASSWORD = 'BXK05wm9deEsgzOV4jKWbdTJVvkZznSZxhJa5CyQ';
process.env.WEB3_TIMEOUT = '1000';

jest.mock('../../../../../config/chains_config.json', () => {
  return [
    ...chainConfigJsonMock,
    {
      chainId: 56,
      name: 'BSC',
      debridgeAddr: '0x43dE2d77BF8027e25dBD179B491e8d64f38398aA',
      firstStartBlock: 19719000,
      providers: ['https://bsc-dataseed1.binance.org'],
      interval: 10000,
      blockConfirmation: 12,
      maxBlockRange: 5000,
    },
  ];
});

import { ChainConfigService } from '../../../../chain/config/services/ChainConfigService';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceSimpleMock } from '../../../../../tests/mocks/config.service.simple.mock';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../../../../entities/SubmissionEntity';
import { CheckAssetsEventAction } from '../CheckAssetsEventAction';
import { ConfirmNewAssetEntity } from '../../../../../entities/ConfirmNewAssetEntity';
import { SolanaApiService } from '../../../../external/solana_api/services/SolanaApiService';
import { GetAddressInfoResponseDto } from '../../../../external/solana_api/dto/response/get.address.info.response.dto';
import { GetBridgeInfoResponseDto } from '../../../../external/solana_api/dto/response/get.bridge.info.response.dto';
import { Web3Module } from '../../../../web3/Web3Module';
import { Web3Service } from '../../../../web3/services/Web3Service';
import { EvmChainConfig } from '../../../../chain/config/models/configs/EvmChainConfig';

describe('CheckAssetsEventAction', () => {
  let service: CheckAssetsEventAction;
  let web3Service: Web3Service;
  let chainConfigService: ChainConfigService;
  const save = jest.fn(() => {
    return {};
  });
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [Web3Module],
      providers: [
        ChainConfigService,
        {
          provide: ConfigService,
          useClass: ConfigServiceSimpleMock,
        },
        {
          provide: getRepositoryToken(SubmissionEntity),
          useValue: {
            find: async () => {
              return [
                {
                  submissionId: '0x872865023136bd9b4e0cccc78fddd5f8c45912a1e94cdcb5165be54316f4f335',
                  txHash: '0x81222783a70dae5c78c95df8e8822559dd4e480217f32aa1cd8ae6013d56dd0f',
                  chainFrom: 56,
                  chainTo: 7565164,
                  debridgeId: '0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a',
                  receiverAddr: '0x7e52ec4bb4b72d0f8d638e19c192bf2007cdac5188c3ed66463a0c7201fe668f',
                  amount: '8990000',
                  rawEvent:
                    '{"logIndex":71,"blockNumber":19719054,"transactionHash":"0x81222783a70dae5c78c95df8e8822559dd4e480217f32aa1cd8ae6013d56dd0f","transactionIndex":21,"blockHash":"0xca356d8c4b2bb34cbde3a54dc320074e103cb5420b3c448e8aa2041a880f635b","removed":false,"address":"0x43dE2d77BF8027e25dBD179B491e8d64f38398aA","id":"log_6da7113d","returnValues":{"0":"0x872865023136bd9b4e0cccc78fddd5f8c45912a1e94cdcb5165be54316f4f335","1":"0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a","2":"8990000","3":"0x7e52ec4bb4b72d0f8d638e19c192bf2007cdac5188c3ed66463a0c7201fe668f","4":"18135","5":"7565164","6":"1","7":["10000000","5000000000000000","10000",false,false],"8":"0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000207e52ec4bb4b72d0f8d638e19c192bf2007cdac5188c3ed66463a0c7201fe668f0000000000000000000000000000000000000000000000000000000000000000","9":"0xB779DaeAD6031Ef189cAD4Ac438c991Efe7635A7","submissionId":"0x872865023136bd9b4e0cccc78fddd5f8c45912a1e94cdcb5165be54316f4f335","debridgeId":"0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a","amount":"8990000","receiver":"0x7e52ec4bb4b72d0f8d638e19c192bf2007cdac5188c3ed66463a0c7201fe668f","nonce":"18135","chainIdTo":"7565164","referralCode":"1","feeParams":["10000000","5000000000000000","10000",false,false],"autoParams":"0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000207e52ec4bb4b72d0f8d638e19c192bf2007cdac5188c3ed66463a0c7201fe668f0000000000000000000000000000000000000000000000000000000000000000","nativeSender":"0xB779DaeAD6031Ef189cAD4Ac438c991Efe7635A7","chainIdFrom":56},"event":"Sent","signature":"0xe315721819a1f353fe56de404206bdd896ab5edc7822f1804a8c4c2c4788174c","raw":{"data":"0x872865023136bd9b4e0cccc78fddd5f8c45912a1e94cdcb5165be54316f4f3350000000000000000000000000000000000000000000000000000000000892d30000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000046d7000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000009896800000000000000000000000000000000000000000000000000011c37937e0800000000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000b779daead6031ef189cad4ac438c991efe7635a700000000000000000000000000000000000000000000000000000000000000207e52ec4bb4b72d0f8d638e19c192bf2007cdac5188c3ed66463a0c7201fe668f0000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000207e52ec4bb4b72d0f8d638e19c192bf2007cdac5188c3ed66463a0c7201fe668f0000000000000000000000000000000000000000000000000000000000000000","topics":["0xe315721819a1f353fe56de404206bdd896ab5edc7822f1804a8c4c2c4788174c","0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a","0x0000000000000000000000000000000000000000000000000000000000736f6c"]}}',
                  signature:
                    '0xfa10aacee13fcdc4f2897f307df7f066e46252957a95ec017f05184f4276fb064ecd06e26c44e7ba60129f30fa8ed402f19ed85bbcded561adf11a3df11195de1c',
                  ipfsLogHash: null,
                  ipfsKeyHash: null,
                  externalId: null,
                  status: 2,
                  ipfsStatus: 1,
                  apiStatus: 1,
                  assetsStatus: 1,
                  nonce: 18135,
                  blockNumber: 19719054,
                  decimalDenominator: 0,
                  createdAt: '2022-08-06T12:04:29.241Z',
                  updatedAt: '2022-08-06T12:04:33.949Z',
                },
              ];
            },
            update: async () => {
              return;
            },
          },
        },
        {
          provide: getRepositoryToken(ConfirmNewAssetEntity),
          useValue: {
            find: async () => {
              return [];
            },
            findOne: async () => {
              return undefined;
            },
            save,
          },
        },
        {
          provide: SolanaApiService,
          useValue: {
            getAddressInfo: async () => {
              return {
                tokenName: 'Wrapped SOL',
                tokenSymbol: 'SOL',
              } as GetAddressInfoResponseDto;
            },
            getTokenDecimals: async () => {
              return 9;
            },
            getBridgeInfo: async () => {
              return {
                nativeChainId: 7,
                nativeTokenAddress: '',
                tokenToReceiveAddress: '',
              } as GetBridgeInfoResponseDto;
            },
          },
        },
        CheckAssetsEventAction,
      ],
    }).compile();
    service = module.get(CheckAssetsEventAction);
    web3Service = module.get(Web3Service);
    chainConfigService = module.get(ChainConfigService);
  });

  it('BSC -> SOlANA', async () => {
    const chainConfigBsc = chainConfigService.get(56) as EvmChainConfig;
    await web3Service.validateChainId(chainConfigBsc.providers, 'https://bsc-dataseed1.binance.org');
    await service.process();
    expect(save).toHaveBeenCalledWith({
      apiStatus: 1,
      debridgeId: '0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a',
      decimals: 9,
      deployId: '0xf9eb884a4467455325ead9c5c945f29af4c5f9e9731c28d9a379a69e0de30fee',
      ipfsStatus: 1,
      name: 'Wrapped SOL',
      nativeChainId: '7565164',
      signature:
        '0xf48b85ca9386b82f8ce3945b47ebd12e609018185864b022678b89e2d60f72db58ea6d70df6c4dbb98f748ecd7c930ba03556568fd9bcb0b204b5a06676f73a81b',
      status: 2,
      submissionChainFrom: 56,
      submissionChainTo: 7565164,
      submissionTxHash: '0x81222783a70dae5c78c95df8e8822559dd4e480217f32aa1cd8ae6013d56dd0f',
      symbol: 'SOL',
      tokenAddress: '0x069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001',
    });
  });
});
