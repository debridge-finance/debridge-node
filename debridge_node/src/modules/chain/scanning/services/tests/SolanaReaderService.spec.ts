import { chainConfigJsonMock } from '../../../../../tests/mocks/chain.config.json.mock';
import { SolanaReaderService } from '../SolanaReaderService';
import { Test, TestingModule } from '@nestjs/testing';
import { ChainConfigModule } from '../../../config/ChainConfigModule';
import { TransformService } from '../TransformService';
import { ConfigService } from '@nestjs/config';
import { SubmissionProcessingService } from '../SubmissionProcessingService';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../../../../entities/SubmissionEntity';
import { SupportedChainEntity } from '../../../../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SolanaApiService } from '../../../../external/solana_api/services/SolanaApiService';

jest.mock('../../../../../config/chains_config.json', () => {
  return chainConfigJsonMock;
});

describe('SolanaReaderService', () => {
  let service: SolanaReaderService;
  let submissionProcessingService: SubmissionProcessingService;
  let repository: Repository<SubmissionEntity>;

  const updateChainMock = jest.fn().mockImplementation(async () => {
    return;
  });
  const process = jest.fn().mockImplementation(async () => {
    return;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ChainConfigModule],
      providers: [
        TransformService,
        SolanaReaderService,
        {
          provide: ConfigService,
          useValue: {
            get: () => {
              return 200;
            },
          },
        },
        {
          provide: SubmissionProcessingService,
          useValue: {
            process,
          },
        },
        {
          provide: getRepositoryToken(SupportedChainEntity),
          useValue: {
            findOne: async () => {
              return {};
            },
            update: updateChainMock,
          },
        },
        {
          provide: SolanaApiService,
          useValue: {
            getHistoricalData: async () => {
              return ['afkksfkfskkfsksfk', '4A9LBuKYsYG88RMC6qdxp2hHRcCSMZfRdYoRJPDinZaEcybMc7E4mzACihPmpG3HXHoRzJk1xAMzT2WFpKXCdhnY'];
            },

            getEventsFromTransactions: async () => {
              return [
                {
                  type: 'staked',
                  amount: '18834000',
                  receiver: '0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d',
                  bridgeId: 'afafaaf',
                  chainToId: 137,
                  nonce: 24,
                  transactionTimestamp: 1655412507,
                  transactionHash: '4A9LBuKYsYG88RMC6qdxp2hHRcCSMZfRdYoRJPDinZaEcybMc7E4mzACihPmpG3HXHoRzJk1xAMzT2WFpKXCdhnY',
                  slotNumber: 137802936,
                  submissionId: '0x04d7baef204c472587c67e233d97a35085de91fc00d2cf5b7f1244020ccd2fa9',
                  referralCode: 19,
                  executionFee: '1146000',
                  flags: '1',
                  fallbackAddress: '0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d',
                  extCallShortcut: '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
                  nativeSender: '0x745c23dfc5aef34c755e48e1cfa77cc427e71a2cc83d976aea9c58a2fa1e63af',
                  fixFee: '10000',
                  transferFee: '20000',
                  useAssetFee: false,
                  lockedOrMintedAmount: '859354220',
                  tokenTotalSupply: '0',
                  receivedAmount: '20000000',
                },
                {
                  type: 'staked',
                  amount: '18834000',
                  receiver: '0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d',
                  bridgeId: '0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a',
                  chainToId: 137,
                  nonce: 23,
                  transactionTimestamp: 1655412507,
                  transactionHash: 'afkksfkfskkfsksfk',
                  slotNumber: 137802935,
                  submissionId: 'sfkkfskskfksfks',
                  referralCode: 19,
                  executionFee: '1146000',
                  flags: '1',
                  fallbackAddress: '0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d',
                  extCallShortcut: '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
                  nativeSender: '0x745c23dfc5aef34c755e48e1cfa77cc427e71a2cc83d976aea9c58a2fa1e63af',
                  fixFee: '10000',
                  transferFee: '20000',
                  useAssetFee: false,
                  lockedOrMintedAmount: '859354220',
                  tokenTotalSupply: '0',
                  receivedAmount: '20000000',
                },
              ];
            },

            getLastBlock: async () => {
              return 23071999;
            },
          },
        },
      ],
    }).compile();

    service = module.get(SolanaReaderService);
    submissionProcessingService = module.get(SubmissionProcessingService);
    repository = module.get(getRepositoryToken(SupportedChainEntity));
  });

  it('test', async () => {
    jest.spyOn(repository, 'update');
    jest.spyOn(submissionProcessingService, 'process');
    await service.syncTransactions(7565164);
    expect(submissionProcessingService.process).toHaveBeenCalledWith(
      [
        {
          submissionId: 'sfkkfskskfksfks',
          txHash: 'afkksfkfskkfsksfk',
          chainFrom: 7565164,
          chainTo: 137,
          receiverAddr: '0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d',
          amount: '18834000',
          rawEvent:
            '{"type":"staked","amount":"18834000","receiver":"0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d","bridgeId":"0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a","chainToId":137,"nonce":23,"transactionTimestamp":1655412507,"transactionHash":"afkksfkfskkfsksfk","slotNumber":137802935,"submissionId":"sfkkfskskfksfks","referralCode":19,"executionFee":"1146000","flags":"1","fallbackAddress":"0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d","extCallShortcut":"0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470","nativeSender":"0x745c23dfc5aef34c755e48e1cfa77cc427e71a2cc83d976aea9c58a2fa1e63af","fixFee":"10000","transferFee":"20000","useAssetFee":false,"lockedOrMintedAmount":"859354220","tokenTotalSupply":"0","receivedAmount":"20000000"}',
          debridgeId: '0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a',
          nonce: 23,
          blockNumber: 137802935,
          status: 1,
          ipfsStatus: 1,
          apiStatus: 1,
          assetsStatus: 1,
        },
        {
          submissionId: '0x04d7baef204c472587c67e233d97a35085de91fc00d2cf5b7f1244020ccd2fa9',
          txHash: '4A9LBuKYsYG88RMC6qdxp2hHRcCSMZfRdYoRJPDinZaEcybMc7E4mzACihPmpG3HXHoRzJk1xAMzT2WFpKXCdhnY',
          chainFrom: 7565164,
          chainTo: 137,
          receiverAddr: '0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d',
          amount: '18834000',
          rawEvent:
            '{"type":"staked","amount":"18834000","receiver":"0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d","bridgeId":"afafaaf","chainToId":137,"nonce":24,"transactionTimestamp":1655412507,"transactionHash":"4A9LBuKYsYG88RMC6qdxp2hHRcCSMZfRdYoRJPDinZaEcybMc7E4mzACihPmpG3HXHoRzJk1xAMzT2WFpKXCdhnY","slotNumber":137802936,"submissionId":"0x04d7baef204c472587c67e233d97a35085de91fc00d2cf5b7f1244020ccd2fa9","referralCode":19,"executionFee":"1146000","flags":"1","fallbackAddress":"0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d","extCallShortcut":"0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470","nativeSender":"0x745c23dfc5aef34c755e48e1cfa77cc427e71a2cc83d976aea9c58a2fa1e63af","fixFee":"10000","transferFee":"20000","useAssetFee":false,"lockedOrMintedAmount":"859354220","tokenTotalSupply":"0","receivedAmount":"20000000"}',
          debridgeId: 'afafaaf',
          nonce: 24,
          blockNumber: 137802936,
          status: 1,
          ipfsStatus: 1,
          apiStatus: 1,
          assetsStatus: 1,
        },
      ],
      7565164,
      '4A9LBuKYsYG88RMC6qdxp2hHRcCSMZfRdYoRJPDinZaEcybMc7E4mzACihPmpG3HXHoRzJk1xAMzT2WFpKXCdhnY',
    );
    expect(repository.update).toHaveBeenCalledWith(
      {
        chainId: 7565164,
      },
      {
        latestBlock: 23071999,
      },
    );
  });
});
