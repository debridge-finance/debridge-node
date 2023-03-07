import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../../../enums/SubmisionStatusEnum';
import { ConfirmNewAssetEntity } from '../../../../entities/ConfirmNewAssetEntity';
import { BundlrStatusEnum } from '../../../../enums/BundlrStatusEnum';
import { BundlrService } from '../../../external/bundlr/BundlrService';

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
            {
              name: 'txHash',
              value: submission.txHash,
            },
            {
              name: 'signature',
              value: submission.signature,
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
        this.logger.verbose(`Uploading asset to bundlr started ${asset.deployId}`);

        const bundlrTx = await this.bundlrService.upload(JSON.stringify(asset), [
          {
            name: 'deployId',
            value: asset.deployId,
          },
          {
            name: 'signature',
            value: asset.signature,
          },
          {
            name: 'tokenAddress',
            value: asset.tokenAddress,
          },
          {
            name: 'tokenDecimals',
            value: asset.decimals.toString(),
          },
          {
            name: 'nativeChainId',
            value: asset.nativeChainId.toString(),
          },
          {
            name: 'debridgeId',
            value: asset.debridgeId,
          },
          {
            name: 'tokenName',
            value: asset.name,
          },
          {
            name: 'tokenSymbol',
            value: asset.symbol,
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
