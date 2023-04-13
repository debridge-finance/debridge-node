import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Web3Service } from '../../../../web3/services/Web3Service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../../../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../../../../entities/ConfirmNewAssetEntity';
import { CheckAssetsEventAction } from '../CheckAssetsEventAction';
import { ChainConfigService } from '../../../../chain/config/services/ChainConfigService';
import { SolanaApiService } from '../../../../external/solana_api/services/SolanaApiService';

describe('CheckAssetsEventAction', () => {
  let service: CheckAssetsEventAction;
  let findOneConfirmNewAssetEntity;
  let findSubmission;
  let updateSubmission;
  let saveConfirmNewAssetEntity;
  let getChainConfig;
  let getBridgeInfo;
  let getAddressInfo;
  let getTokenDecimals;

  beforeEach(async () => {
    findSubmission = jest.fn().mockResolvedValue([]);
    findOneConfirmNewAssetEntity = jest.fn().mockResolvedValue(undefined);
    getChainConfig = jest.fn().mockResolvedValue(undefined);
    getBridgeInfo = jest.fn().mockResolvedValue({
      nativeChainId: 2,
      nativeTokenAddress: '0xnativetokensolana',
    });
    getAddressInfo = jest.fn().mockResolvedValue({
      tokenName: 'solana token name',
      tokenSymbol: 'sol',
    });
    getTokenDecimals = jest.fn().mockResolvedValue(9);
    updateSubmission = jest.fn().mockResolvedValue(undefined);
    saveConfirmNewAssetEntity = jest.fn().mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test'),
          },
        },
        CheckAssetsEventAction,
        {
          provide: Web3Service,
          useValue: {
            web3: () => {
              return {
                utils: {
                  soliditySha3Raw: jest.fn().mockImplementation((...data) => {
                    return JSON.stringify(data);
                  }),
                },
                eth: {
                  accounts: {
                    decrypt: () => {
                      return {
                        sign: (signature: string) => {
                          return { signature };
                        },
                      };
                    },
                  },
                },
              };
            },
            web3HttpProvider: jest.fn().mockReturnValue({
              eth: {
                Contract: jest.fn().mockImplementation(() => {
                  return {
                    methods: {
                      getDebridge: jest.fn().mockReturnValue({
                        call: jest.fn().mockReturnValue({
                          chainId: 2,
                          tokenAddress: '0xtokenAddress',
                        }),
                      }),
                      getNativeInfo: jest.fn().mockReturnValue({
                        call: jest.fn().mockReturnValue({
                          nativeAddress: '0xnativeAddress',
                        }),
                      }),
                      name: jest.fn().mockReturnValue({
                        call: jest.fn().mockReturnValue('USDC'),
                      }),
                      symbol: jest.fn().mockReturnValue({
                        call: jest.fn().mockReturnValue('EVM'),
                      }),
                      decimals: jest.fn().mockReturnValue({
                        call: jest.fn().mockReturnValue(18),
                      }),
                    },
                  };
                }),
              },
            }),
          },
        },
        {
          provide: getRepositoryToken(SubmissionEntity),
          useValue: {
            find: findSubmission,
            update: updateSubmission,
          },
        },
        {
          provide: getRepositoryToken(ConfirmNewAssetEntity),
          useValue: {
            findOne: findOneConfirmNewAssetEntity,
            save: saveConfirmNewAssetEntity,
          },
        },
        {
          provide: ChainConfigService,
          useValue: {
            get: getChainConfig,
          },
        },
        {
          provide: SolanaApiService,
          useValue: {
            getBridgeInfo,
            getAddressInfo,
            getTokenDecimals,
          },
        },
      ],
    }).compile();
    service = module.get(CheckAssetsEventAction);
  });

  it('no new confirm assets', async () => {
    await service.process();
    expect(findSubmission).toHaveBeenCalledTimes(1);
    expect(updateSubmission).toHaveBeenCalledTimes(0);
    expect(saveConfirmNewAssetEntity).toHaveBeenCalledTimes(0);
  });

  it('process new confirm assets from evm to evm', async () => {
    findSubmission.mockReset().mockReturnValue([
      {
        submissionId: '1',
        debridgeId: '1',
        chainFrom: 1,
        chainTo: 2,
      } as SubmissionEntity,
    ]);
    getChainConfig.mockReset().mockImplementation((chainId: number) => {
      return {
        chainId,
        isSolana: false,
      };
    });
    await service.process();
    expect(findSubmission).toHaveBeenCalledTimes(1);
    expect(updateSubmission).toHaveBeenCalledTimes(1);
    expect(saveConfirmNewAssetEntity).toHaveBeenCalledWith({
      debridgeId: '1',
      nativeChainId: 2,
      tokenAddress: '0xnativeAddress',
      name: 'USDC',
      symbol: 'EVM',
      decimals: 18,
      submissionChainFrom: 1,
      submissionChainTo: 2,
      status: 2,
      ipfsStatus: 1,
      apiStatus: 1,
      bundlrStatus: 1,
      signature:
        '[{"t":"uint256","v":2},{"t":"bytes32","v":"1"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"USDC\\"}]"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"EVM\\"}]"},{"t":"uint8","v":18}]',
      deployId:
        '[{"t":"uint256","v":2},{"t":"bytes32","v":"1"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"USDC\\"}]"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"EVM\\"}]"},{"t":"uint8","v":18}]',
    });
  });

  it('process new confirm assets from evm to solana', async () => {
    findSubmission.mockReset().mockReturnValue([
      {
        submissionId: '1',
        debridgeId: '1',
        chainFrom: 1,
        chainTo: 2,
      } as SubmissionEntity,
    ]);
    getChainConfig.mockReset().mockImplementation((chainId: number) => {
      if (chainId === 1) {
        return {
          isSolana: false,
        };
      } else if (chainId === 2) {
        return {
          isSolana: true,
        };
      }
    });
    await service.process();
    expect(findSubmission).toHaveBeenCalledTimes(1);
    expect(updateSubmission).toHaveBeenCalledTimes(1);
    expect(saveConfirmNewAssetEntity).toHaveBeenCalledWith({
      debridgeId: '1',
      nativeChainId: 2,
      tokenAddress: '0xnativeAddress',
      name: 'solana token name',
      symbol: 'sol',
      decimals: 9,
      submissionChainFrom: 1,
      submissionChainTo: 2,
      status: 2,
      ipfsStatus: 1,
      apiStatus: 1,
      bundlrStatus: 1,
      signature:
        '[{"t":"uint256","v":2},{"t":"bytes32","v":"1"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"solana token name\\"}]"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"sol\\"}]"},{"t":"uint8","v":9}]',
      deployId:
        '[{"t":"uint256","v":2},{"t":"bytes32","v":"1"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"solana token name\\"}]"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"sol\\"}]"},{"t":"uint8","v":9}]',
    });
  });

  it('process new confirm assets from solana to evm', async () => {
    findSubmission.mockReset().mockReturnValue([
      {
        submissionId: '1',
        debridgeId: '1',
        chainFrom: 1,
        chainTo: 2,
      } as SubmissionEntity,
    ]);
    getChainConfig.mockReset().mockImplementation((chainId: number) => {
      if (chainId === 2) {
        return {
          isSolana: false,
        };
      } else if (chainId === 1) {
        return {
          isSolana: true,
        };
      }
    });
    await service.process();
    expect(findSubmission).toHaveBeenCalledTimes(1);
    expect(updateSubmission).toHaveBeenCalledTimes(1);
    expect(saveConfirmNewAssetEntity).toHaveBeenCalledWith({
      debridgeId: '1',
      nativeChainId: 2,
      tokenAddress: '0xnativetokensolana',
      name: 'USDC',
      symbol: 'EVM',
      decimals: 18,
      submissionChainFrom: 1,
      submissionChainTo: 2,
      status: 2,
      ipfsStatus: 1,
      apiStatus: 1,
      bundlrStatus: 1,
      signature:
        '[{"t":"uint256","v":2},{"t":"bytes32","v":"1"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"USDC\\"}]"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"EVM\\"}]"},{"t":"uint8","v":18}]',
      deployId:
        '[{"t":"uint256","v":2},{"t":"bytes32","v":"1"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"USDC\\"}]"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"EVM\\"}]"},{"t":"uint8","v":18}]',
    });
  });

  it('process new confirm assets from solana to solana', async () => {
    findSubmission.mockReset().mockReturnValue([
      {
        submissionId: '1',
        debridgeId: '1',
        chainFrom: 1,
        chainTo: 2,
      } as SubmissionEntity,
    ]);
    getChainConfig.mockReset().mockImplementation((chainId: number) => {
      if (chainId === 1) {
        return {
          isSolana: true,
        };
      } else if (chainId === 2) {
        return {
          isSolana: true,
        };
      }
    });
    await service.process();
    expect(findSubmission).toHaveBeenCalledTimes(1);
    expect(updateSubmission).toHaveBeenCalledTimes(1);

    expect(saveConfirmNewAssetEntity).toHaveBeenCalledWith({
      debridgeId: '1',
      nativeChainId: 2,
      tokenAddress: '0xnativetokensolana',
      name: 'solana token name',
      symbol: 'sol',
      decimals: 9,
      submissionChainFrom: 1,
      submissionChainTo: 2,
      status: 2,
      ipfsStatus: 1,
      apiStatus: 1,
      bundlrStatus: 1,
      signature:
        '[{"t":"uint256","v":2},{"t":"bytes32","v":"1"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"solana token name\\"}]"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"sol\\"}]"},{"t":"uint8","v":9}]',
      deployId:
        '[{"t":"uint256","v":2},{"t":"bytes32","v":"1"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"solana token name\\"}]"},{"t":"bytes32","v":"[{\\"t\\":\\"string\\",\\"v\\":\\"sol\\"}]"},{"t":"uint8","v":9}]',
    });
  });
});
