import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

      if (submissions.length > 0) {
        await this.confirmSubmissions(submissions);
      }
    } catch (e) {
      this.logger.error(e);
    }

    try {
      //Process Assets
      const assets = await this.confirmNewAssetEntityRepository.find({
        where: {
          status: SubmisionStatusEnum.SIGNED,
          apiStatus: UploadStatusEnum.NEW,
        },
      });

      if (assets.length > 0) {
        await this.confirmAssets(assets);
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  private async confirmSubmissions(submissions: SubmissionEntity[]) {
    try {
      const bundlrTx = await this.bundlrService.upload(
        JSON.stringify(
          submissions.map(submission => {
            return {
              txHash: submission.txHash,
              signature: submission.signature,
              submissionId: submission.submissionId,
              chainId: submission.chainFrom,
            };
          }),
        ),
      );
      await this.submissionsRepository.update(
        {
          submissionId: In(submissions.map(submission => submission.submissionId)),
        },
        {
          bundlrStatus: BundlrStatusEnum.UPLOADED,
          bundlrTx,
        },
      );
      this.logger.log(`setting bundlrTx ${bundlrTx} to submissions`);
    } catch (e) {
      this.logger.error(e);
    }
  }

  private async confirmAssets(assets: ConfirmNewAssetEntity[]) {
    try {
      const bundlrTx = await this.bundlrService.upload(JSON.stringify(assets));
      await this.confirmNewAssetEntityRepository.update(
        {
          deployId: In(assets.map(assets => assets.deployId)),
        },
        {
          bundlrStatus: BundlrStatusEnum.UPLOADED,
          bundlrTx: bundlrTx,
        },
      );
    } catch (e) {
      this.logger.error(e);
    }
  }
}
