import { ChainConfigService } from '../../../config/services/ChainConfigService';
import { SolanaReaderService } from '../SolanaReaderService';
import { SubmissionProcessingService } from '../SubmissionProcessingService';
import { TransformService } from '../TransformService';
import { SubmissionEntity } from '../../../../../entities/SubmissionEntity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { SupportedChainEntity } from '../../../../../entities/SupportedChainEntity';
import { SolanaApiService } from '../../../../external/solana_api/services/SolanaApiService';
import { ConfigService } from '@nestjs/config';

const generateTx = (i: number) => {
  return {
    slotNumber: 10 + i,
    transactionTimestamp: 1677708883,
    transactionHash: `tx${i}`,
    transactionState: 'Ok',
    events: [
      {
        type: 'staked',
        amount: '0',
        receiver: '0xef4fb24ad0916217251f553c0596f8edc630eb66',
        bridgeId: '0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a',
        chainToId: 137,
        nonce: i,
        submissionId: '0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891',
        referralCode: null,
        executionFee: '3454000',
        flags: '6',
        fallbackAddress: '0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d',
        extCallShortcut: '0x3511a667d18af712bd59448a976dce33bfd4f60f6b0ae74dac7266bbd4ede06f',
        nativeSender: '0xa192b7f8b3eddc1e930a8e141564bb0ddc9d23f607cf13fd3a9fc15a638ed033',
        fixFee: '30000000',
        transferFee: '3457',
        useAssetFee: false,
        lockedOrMintedAmount: '2327038092',
        tokenTotalSupply: '0',
        decimalDenominator: 0,
        receivedAmount: '3457457',
      },
    ],
  };
};

describe('SolanaReaderService', () => {
  let service: SolanaReaderService;
  let processMock;
  let getHistoricalDataMock;
  let getEventsFromTransactionsMock;
  let findSupportedChainEntityMock;
  let updateSupportedChainEntityMock;

  beforeEach(async () => {
    processMock = jest.fn().mockResolvedValue({});
    getHistoricalDataMock = jest.fn().mockResolvedValue(['tx3', 'tx2', 'tx1']);
    getEventsFromTransactionsMock = jest.fn().mockResolvedValue([generateTx(1), generateTx(2), generateTx(3)]);

    findSupportedChainEntityMock = jest.fn().mockImplementation(async chainId => {
      return {
        chainId,
        latestBlock: 0,
        network: 'eth',
      } as SupportedChainEntity;
    });

    updateSupportedChainEntityMock = jest.fn().mockReturnValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(SubmissionEntity),
          useValue: {
            find: async () => {
              return [
                {
                  submissionId: '123',
                },
              ];
            },
            update: async () => {
              return;
            },
          },
        },
        {
          provide: getRepositoryToken(SupportedChainEntity),
          useValue: {
            findOne: findSupportedChainEntityMock,
            update: updateSupportedChainEntityMock,
          },
        },
        {
          provide: ChainConfigService,
          useValue: {
            getSolanaChainId: () => 7565164,
            get(chainId) {
              return {
                chainId,
                isSolana: chainId !== 1,
                maxBlockRange: 200,
                blockConfirmation: 1,
                debridgeAddr: 'debridgeAddr',
                providers: 'providers',
              };
            },
          },
        },
        {
          provide: SolanaApiService,
          useValue: {
            getHistoricalData: getHistoricalDataMock,
            getLastBlock: jest.fn().mockResolvedValue(1),
            getEventsFromTransactions: getEventsFromTransactionsMock,
          },
        },
        {
          provide: SubmissionProcessingService,
          useValue: {
            process: processMock,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(4),
          },
        },
        TransformService,
        SolanaReaderService,
      ],
    }).compile();
    service = module.get(SolanaReaderService);
  });

  it('should update last block without any processing(last tx the same as in db)', async () => {
    findSupportedChainEntityMock.mockReset().mockImplementation(async chainId => {
      return {
        chainId,
        latestBlock: 0,
        latestSolanaTransaction: 'tx3',
        network: 'eth',
      } as SupportedChainEntity;
    });
    await service.syncTransactions(2);
    expect(updateSupportedChainEntityMock).toBeCalledWith(
      { chainId: 2 },
      {
        latestBlock: 1,
      },
    );
    expect(processMock).toHaveBeenCalledTimes(0);
  });

  it('should update last block without any processing(no new transaction)', async () => {
    getHistoricalDataMock.mockReset().mockResolvedValue([]);
    getEventsFromTransactionsMock.mockReset().mockReturnValue([]);
    await service.syncTransactions(2);
    expect(updateSupportedChainEntityMock).toBeCalledWith(
      { chainId: 2 },
      {
        latestBlock: 1,
      },
    );
    expect(processMock).toHaveBeenCalledTimes(0);
  });

  describe('should process data', () => {
    it('basic', async () => {
      await service.syncTransactions(2);
      expect(getHistoricalDataMock).toHaveBeenCalledTimes(2);
      expect(getEventsFromTransactionsMock).toHaveBeenCalledTimes(1);
      expect(processMock).toBeCalledWith(
        [
          {
            submissionId: '0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891',
            txHash: 'tx1',
            chainFrom: 7565164,
            chainTo: 137,
            receiverAddr: '0xef4fb24ad0916217251f553c0596f8edc630eb66',
            amount: '0',
            rawEvent:
              '{"type":"staked","amount":"0","receiver":"0xef4fb24ad0916217251f553c0596f8edc630eb66","bridgeId":"0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a","chainToId":137,"nonce":1,"submissionId":"0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891","referralCode":null,"executionFee":"3454000","flags":"6","fallbackAddress":"0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d","extCallShortcut":"0x3511a667d18af712bd59448a976dce33bfd4f60f6b0ae74dac7266bbd4ede06f","nativeSender":"0xa192b7f8b3eddc1e930a8e141564bb0ddc9d23f607cf13fd3a9fc15a638ed033","fixFee":"30000000","transferFee":"3457","useAssetFee":false,"lockedOrMintedAmount":"2327038092","tokenTotalSupply":"0","decimalDenominator":0,"receivedAmount":"3457457","transactionHash":"tx1","slotNumber":11}',
            debridgeId: '0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a',
            nonce: 1,
            blockNumber: 11,
            status: 1,
            ipfsStatus: 1,
            apiStatus: 1,
            decimalDenominator: 0,
            assetsStatus: 1,
            bundlrStatus: 1,
          },
          {
            submissionId: '0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891',
            txHash: 'tx2',
            chainFrom: 7565164,
            chainTo: 137,
            receiverAddr: '0xef4fb24ad0916217251f553c0596f8edc630eb66',
            amount: '0',
            rawEvent:
              '{"type":"staked","amount":"0","receiver":"0xef4fb24ad0916217251f553c0596f8edc630eb66","bridgeId":"0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a","chainToId":137,"nonce":2,"submissionId":"0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891","referralCode":null,"executionFee":"3454000","flags":"6","fallbackAddress":"0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d","extCallShortcut":"0x3511a667d18af712bd59448a976dce33bfd4f60f6b0ae74dac7266bbd4ede06f","nativeSender":"0xa192b7f8b3eddc1e930a8e141564bb0ddc9d23f607cf13fd3a9fc15a638ed033","fixFee":"30000000","transferFee":"3457","useAssetFee":false,"lockedOrMintedAmount":"2327038092","tokenTotalSupply":"0","decimalDenominator":0,"receivedAmount":"3457457","transactionHash":"tx2","slotNumber":12}',
            debridgeId: '0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a',
            nonce: 2,
            blockNumber: 12,
            status: 1,
            ipfsStatus: 1,
            apiStatus: 1,
            decimalDenominator: 0,
            assetsStatus: 1,
            bundlrStatus: 1,
          },
          {
            submissionId: '0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891',
            txHash: 'tx3',
            chainFrom: 7565164,
            chainTo: 137,
            receiverAddr: '0xef4fb24ad0916217251f553c0596f8edc630eb66',
            amount: '0',
            rawEvent:
              '{"type":"staked","amount":"0","receiver":"0xef4fb24ad0916217251f553c0596f8edc630eb66","bridgeId":"0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a","chainToId":137,"nonce":3,"submissionId":"0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891","referralCode":null,"executionFee":"3454000","flags":"6","fallbackAddress":"0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d","extCallShortcut":"0x3511a667d18af712bd59448a976dce33bfd4f60f6b0ae74dac7266bbd4ede06f","nativeSender":"0xa192b7f8b3eddc1e930a8e141564bb0ddc9d23f607cf13fd3a9fc15a638ed033","fixFee":"30000000","transferFee":"3457","useAssetFee":false,"lockedOrMintedAmount":"2327038092","tokenTotalSupply":"0","decimalDenominator":0,"receivedAmount":"3457457","transactionHash":"tx3","slotNumber":13}',
            debridgeId: '0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a',
            nonce: 3,
            blockNumber: 13,
            status: 1,
            ipfsStatus: 1,
            apiStatus: 1,
            decimalDenominator: 0,
            assetsStatus: 1,
            bundlrStatus: 1,
          },
        ],
        2,
        'tx3',
      );
      expect(processMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('should process data', () => {
    it('basic', async () => {
      await service.syncTransactions(2);
      expect(getHistoricalDataMock).toHaveBeenCalledTimes(2);
      expect(getEventsFromTransactionsMock).toHaveBeenCalledTimes(1);
      expect(processMock).toBeCalledWith(
        [
          {
            submissionId: '0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891',
            txHash: 'tx1',
            chainFrom: 7565164,
            chainTo: 137,
            receiverAddr: '0xef4fb24ad0916217251f553c0596f8edc630eb66',
            amount: '0',
            rawEvent:
              '{"type":"staked","amount":"0","receiver":"0xef4fb24ad0916217251f553c0596f8edc630eb66","bridgeId":"0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a","chainToId":137,"nonce":1,"submissionId":"0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891","referralCode":null,"executionFee":"3454000","flags":"6","fallbackAddress":"0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d","extCallShortcut":"0x3511a667d18af712bd59448a976dce33bfd4f60f6b0ae74dac7266bbd4ede06f","nativeSender":"0xa192b7f8b3eddc1e930a8e141564bb0ddc9d23f607cf13fd3a9fc15a638ed033","fixFee":"30000000","transferFee":"3457","useAssetFee":false,"lockedOrMintedAmount":"2327038092","tokenTotalSupply":"0","decimalDenominator":0,"receivedAmount":"3457457","transactionHash":"tx1","slotNumber":11}',
            debridgeId: '0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a',
            nonce: 1,
            blockNumber: 11,
            status: 1,
            ipfsStatus: 1,
            apiStatus: 1,
            decimalDenominator: 0,
            assetsStatus: 1,
            bundlrStatus: 1,
          },
          {
            submissionId: '0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891',
            txHash: 'tx2',
            chainFrom: 7565164,
            chainTo: 137,
            receiverAddr: '0xef4fb24ad0916217251f553c0596f8edc630eb66',
            amount: '0',
            rawEvent:
              '{"type":"staked","amount":"0","receiver":"0xef4fb24ad0916217251f553c0596f8edc630eb66","bridgeId":"0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a","chainToId":137,"nonce":2,"submissionId":"0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891","referralCode":null,"executionFee":"3454000","flags":"6","fallbackAddress":"0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d","extCallShortcut":"0x3511a667d18af712bd59448a976dce33bfd4f60f6b0ae74dac7266bbd4ede06f","nativeSender":"0xa192b7f8b3eddc1e930a8e141564bb0ddc9d23f607cf13fd3a9fc15a638ed033","fixFee":"30000000","transferFee":"3457","useAssetFee":false,"lockedOrMintedAmount":"2327038092","tokenTotalSupply":"0","decimalDenominator":0,"receivedAmount":"3457457","transactionHash":"tx2","slotNumber":12}',
            debridgeId: '0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a',
            nonce: 2,
            blockNumber: 12,
            status: 1,
            ipfsStatus: 1,
            apiStatus: 1,
            decimalDenominator: 0,
            assetsStatus: 1,
            bundlrStatus: 1,
          },
          {
            submissionId: '0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891',
            txHash: 'tx3',
            chainFrom: 7565164,
            chainTo: 137,
            receiverAddr: '0xef4fb24ad0916217251f553c0596f8edc630eb66',
            amount: '0',
            rawEvent:
              '{"type":"staked","amount":"0","receiver":"0xef4fb24ad0916217251f553c0596f8edc630eb66","bridgeId":"0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a","chainToId":137,"nonce":3,"submissionId":"0xfadf6e0b875978dbb1736de29b95503076d2d07d036daea63ec4c8d1571ff891","referralCode":null,"executionFee":"3454000","flags":"6","fallbackAddress":"0xb21dfea010e939f4bb0f0cb361352984a8c6ac0d","extCallShortcut":"0x3511a667d18af712bd59448a976dce33bfd4f60f6b0ae74dac7266bbd4ede06f","nativeSender":"0xa192b7f8b3eddc1e930a8e141564bb0ddc9d23f607cf13fd3a9fc15a638ed033","fixFee":"30000000","transferFee":"3457","useAssetFee":false,"lockedOrMintedAmount":"2327038092","tokenTotalSupply":"0","decimalDenominator":0,"receivedAmount":"3457457","transactionHash":"tx3","slotNumber":13}',
            debridgeId: '0x15db45753160f76964dfa867510c9ede0ac87ac9ce24771de7efa0dab8251c1a',
            nonce: 3,
            blockNumber: 13,
            status: 1,
            ipfsStatus: 1,
            apiStatus: 1,
            decimalDenominator: 0,
            assetsStatus: 1,
            bundlrStatus: 1,
          },
        ],
        2,
        'tx3',
      );
      expect(processMock).toHaveBeenCalledTimes(1);
    });

    it('no new submission', async () => {
      getHistoricalDataMock.mockReset().mockResolvedValue(['tx1', 'tx2', 'tx3']);
      getEventsFromTransactionsMock.mockReset().mockResolvedValue([
        {
          slotNumber: 10,
          transactionTimestamp: 1677708883,
          transactionHash: `tx${0}`,
          transactionState: 'Ok',
          events: [],
        },
      ]);
      await service.syncTransactions(2);
      expect(updateSupportedChainEntityMock).toBeCalledWith(2, {
        latestSolanaTransaction: 'tx0',
        latestBlock: 10,
        lastTxTimestamp: '1677708883',
        lastTransactionSlotNumber: 10,
      });
      expect(processMock).toHaveBeenCalledTimes(0);
    });
  });
});
