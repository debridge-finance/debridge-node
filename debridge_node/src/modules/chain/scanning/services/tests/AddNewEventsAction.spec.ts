import { EvmNewEventsReaderAction } from '../EvmNewEventsReaderAction';
import { ChainConfigService } from '../../../config/services/ChainConfigService';
import { Web3Service } from '../../../../web3/services/Web3Service';
import { SolanaReaderService } from '../SolanaReaderService';
import { SubmissionProcessingService } from '../SubmissionProcessingService';
import { TransformService } from '../TransformService';
import { SubmissionEntity } from '../../../../../entities/SubmissionEntity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { SupportedChainEntity } from '../../../../../entities/SupportedChainEntity';

describe('AddNewEventsAction', () => {
  let service: EvmNewEventsReaderAction;
  let processMock;
  let syncTransactionsMock;
  let getPastEventsMock;
  let web3;

  beforeEach(async () => {
    processMock = jest.fn().mockResolvedValue({});
    syncTransactionsMock = jest.fn().mockResolvedValue({});
    getPastEventsMock = jest.fn().mockResolvedValue([
      {
        returnValues: {
          submissionId: 123,
          chainIdFrom: 1,
          chainIdTo: 2,
          debridgeId: 456,
          receiver: 'xyz',
          amount: 100,
          nonce: '789',
        },
        transactionHash: 'abc',
        blockNumber: 10,
      },
    ]);

    web3 = {
      eth: {
        setProvider: jest.fn().mockResolvedValue({}),
        Contract: jest.fn().mockImplementation(() => {
          return {
            setProvider: jest.fn().mockResolvedValue({}),
            getPastEvents: getPastEventsMock,
          };
        }),
        getBlockNumber: jest.fn().mockResolvedValue(100),
      },
    };

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
            findOne: async chainId => {
              return {
                chainId,
                latestBlock: 0,
                network: 'eth',
              } as SupportedChainEntity;
            },
          },
        },
        ChainConfigService,
        {
          provide: ChainConfigService,
          useValue: {
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
          provide: Web3Service,
          useValue: {
            web3HttpProvider: jest.fn().mockImplementation(() => {
              return web3;
            }),
          },
        },
        {
          provide: SolanaReaderService,
          useValue: {
            syncTransactions: syncTransactionsMock,
          },
        },
        {
          provide: SubmissionProcessingService,
          useValue: {
            process: processMock,
          },
        },
        TransformService,
        EvmNewEventsReaderAction,
      ],
    }).compile();
    service = module.get(EvmNewEventsReaderAction);
  });

  it('should solana be executed', async () => {
    await service.action(2);
    expect(syncTransactionsMock).toBeCalled();
  });

  it('should eth be executed', async () => {
    await service.action(1);
    expect(syncTransactionsMock).toBeCalledTimes(0);
    expect(getPastEventsMock).toBeCalledWith('Sent', {
      fromBlock: 98,
      toBlock: 99,
    });
    expect(processMock).toHaveBeenCalledWith(
      [
        {
          submissionId: 123,
          txHash: 'abc',
          chainFrom: 1,
          chainTo: 2,
          debridgeId: 456,
          receiverAddr: 'xyz',
          amount: 100,
          status: 1,
          ipfsStatus: 1,
          apiStatus: 1,
          assetsStatus: 1,
          rawEvent:
            '{"returnValues":{"submissionId":123,"chainIdFrom":1,"chainIdTo":2,"debridgeId":456,"receiver":"xyz","amount":100,"nonce":"789"},"transactionHash":"abc","blockNumber":10}',
          blockNumber: 10,
          nonce: 789,
          bundlrStatus: 1,
        },
      ],
      1,
      99,
      web3,
    );
    expect(processMock).toBeCalledTimes(1);
  });
});
