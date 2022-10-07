import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../../../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../../../../entities/ConfirmNewAssetEntity';
import { In, Repository } from 'typeorm';
import { UploadStatusEnum } from '../../../../../enums/UploadStatusEnum';
import { Web3Service } from '../../../../web3/services/Web3Service';
import { chainConfigJsonMock } from '../../../../../tests/mocks/chain.config.json.mock';
import { UploadToBundlrAction } from '../UploadToBundlrAction';
import { BundlrService } from '../../../../external/bundlr/bundlr.service';

jest.mock('../../../../../config/chains_config.json', () => {
  return chainConfigJsonMock;
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
            upload: async (submissions: []) => {
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
        submissionId: In(['123']),
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
        deployId: In(['1']),
      },
      {
        bundlrStatus: UploadStatusEnum.UPLOADED,
        bundlrTx: 'id',
      },
    );
  });
});
