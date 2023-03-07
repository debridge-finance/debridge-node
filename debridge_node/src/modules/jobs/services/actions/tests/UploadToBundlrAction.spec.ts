import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../../../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../../../../entities/ConfirmNewAssetEntity';
import { Repository } from 'typeorm';
import { UploadStatusEnum } from '../../../../../enums/UploadStatusEnum';
import { Web3Service } from '../../../../web3/services/Web3Service';
import { UploadToBundlrAction } from '../UploadToBundlrAction';
import { BundlrService } from '../../../../external/bundlr/BundlrService';

jest.mock('../../../../../config/chains_config.json', () => {
  return [
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
  ];
});

describe('UploadToBundlrAction', () => {
  let service: UploadToBundlrAction;
  let submissionRepository: Repository<SubmissionEntity>;
  let confirmNewAssetRepository: Repository<ConfirmNewAssetEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, HttpModule],
      providers: [
        UploadToBundlrAction,
        {
          provide: BundlrService,
          useValue: {
            upload: async () => {
              return 'id';
            },
          },
        },
        {
          provide: Web3Service,
          useValue: {
            web3: () => {
              return {
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
          },
        },
        {
          provide: getRepositoryToken(SubmissionEntity),
          useValue: {
            find: async () => {
              return [
                {
                  submissionId: '123',
                  registrationId: '1234',
                },
              ];
            },
            update: async input => {
              return input;
            },
          },
        },
        {
          provide: getRepositoryToken(ConfirmNewAssetEntity),
          useValue: {
            find: async () => {
              return [
                {
                  deployId: '1',
                  nativeChainId: '1',
                  decimals: '1',
                },
              ];
            },
            update: async input => {
              return input;
            },
          },
        },
      ],
    }).compile();
    service = module.get(UploadToBundlrAction);
    submissionRepository = module.get(getRepositoryToken(SubmissionEntity));
    confirmNewAssetRepository = module.get(getRepositoryToken(ConfirmNewAssetEntity));
  });

  it('Update Submission', async () => {
    jest.spyOn(submissionRepository, 'update');
    await service.process();
    expect(submissionRepository.update).toHaveBeenCalledWith(
      {
        submissionId: '123',
      },
      {
        bundlrStatus: UploadStatusEnum.UPLOADED,
        bundlrTx: 'id',
      },
    );
  });

  it('Update ConfirmNewAssets', async () => {
    jest.spyOn(confirmNewAssetRepository, 'update');
    await service.process();
    expect(confirmNewAssetRepository.update).toHaveBeenCalledWith(
      {
        deployId: '1',
      },
      {
        bundlrStatus: UploadStatusEnum.UPLOADED,
        bundlrTx: 'id',
      },
    );
  });
});
