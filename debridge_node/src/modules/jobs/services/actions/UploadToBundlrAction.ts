import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../../../enums/SubmisionStatusEnum';
import { UploadStatusEnum } from '../../../../enums/UploadStatusEnum';
import { ConfirmNewAssetEntity } from '../../../../entities/ConfirmNewAssetEntity';
import { BundlrStatusEnum } from '../../../../enums/BundlrStatusEnum';
import { BundlrService } from '../../../external/bundlr/bundlr.service';

//Action that update signatures to bundlr
@Injectable()
export class UploadToBundlrAction extends IAction {
  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(ConfirmNewAssetEntity)
    private readonly confirmNewAssetEntityRepository: Repository<ConfirmNewAssetEntity>,
    private readonly bundlrService: BundlrService,
  ) {
    super();
    this.logger = new Logger(UploadToBundlrAction.name);
  }

  async process(): Promise<void> {
    this.logger.log(`process UploadToBundlrAction`);

    try {
      const submissions = await this.submissionsRepository.find({
        where: {
          status: SubmisionStatusEnum.SIGNED,
          bundlrStatus: BundlrStatusEnum.NEW,
        },
      });
      for (const submission of submissions) {
        await this.submissionsRepository.update(
          {
            submissionId: submission.submissionId,
          },
          {
            bundlrStatus: BundlrStatusEnum.UPLOADING_STARTED,
          },
        );
        this.logger.verbose(`Uploading submission to bundlr started ${submission.submissionId}`);

        const bundlrTx = await this.bundlrService.upload(
          JSON.stringify({
            txHash: submission.txHash,
            signature: submission.signature,
            submissionId: submission.submissionId,
            chainId: submission.chainFrom,
          }),
          [
            {
              name: 'submissionId',
              value: submission.submissionId,
            },
          ],
        );

        await this.submissionsRepository.update(
          {
            submissionId: submission.submissionId,
          },
          {
            bundlrStatus: BundlrStatusEnum.UPLOADED,
            bundlrTx,
          },
        );
        this.logger.verbose(`Uploading submission to bundlr finished ${submission.submissionId}`);
      }
    } catch (e) {
      this.logger.error(e);
    }

    try {
      //Process Assets
      const assets = await this.confirmNewAssetEntityRepository.find({
        where: {
          status: SubmisionStatusEnum.SIGNED,
          bundlrStatus: BundlrStatusEnum.NEW,
        },
      });

      for (const asset of assets) {
        await this.confirmNewAssetEntityRepository.update(
          {
            deployId: asset.deployId,
          },
          {
            bundlrStatus: BundlrStatusEnum.UPLOADING_STARTED,
          },
        );
        this.logger.verbose(`Uploading asset to bundlr started ${asset.deployId}`);

        const bundlrTx = await this.bundlrService.upload(JSON.stringify(asset), [
          {
            name: 'deployId',
            value: asset.deployId,
          },
        ]);

        await this.confirmNewAssetEntityRepository.update(
          {
            deployId: asset.deployId,
          },
          {
            bundlrStatus: BundlrStatusEnum.UPLOADED,
            bundlrTx,
          },
        );
        this.logger.verbose(`Uploading asset to bundlr finished ${asset.deployId}`);
      }
    } catch (e) {
      this.logger.error(e);
    }
  }
}
