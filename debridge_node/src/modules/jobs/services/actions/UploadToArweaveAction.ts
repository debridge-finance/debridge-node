import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../../../enums/SubmisionStatusEnum';
import { ConfirmNewAssetEntity } from '../../../../entities/ConfirmNewAssetEntity';
import { BundlrStatusEnum } from '../../../../enums/BundlrStatusEnum';
import { TurboService } from '../../../external/arweave/TurboService';

//Action that update signatures to arweave
@Injectable()
export class UploadToArweaveAction extends IAction {
  constructor(
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(ConfirmNewAssetEntity)
    private readonly confirmNewAssetEntityRepository: Repository<ConfirmNewAssetEntity>,
    private readonly arweaveService: TurboService,
  ) {
    super();
    this.logger = new Logger(UploadToArweaveAction.name);
  }

  async process(): Promise<void> {
    if (!this.arweaveService.isInitialized()) {
      return;
    }
    this.logger.log(`process UploadToArweaveAction`);

    try {
      const submissions = await this.submissionsRepository.find({
        where: {
          status: SubmisionStatusEnum.SIGNED,
          bundlrStatus: BundlrStatusEnum.NEW,
        },
      });
      for (const submission of submissions) {
        this.logger.verbose(`Uploading submission to arweave started ${submission.submissionId}`);

        const bundlrTx = await this.arweaveService.upload(
          JSON.stringify({
            txHash: submission.txHash,
            signature: submission.signature,
            submissionId: submission.submissionId,
            chainIdFrom: submission.chainFrom,
            chainIdTo: submission.chainTo,
            nonce: submission.nonce,
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
            {
              name: 'chainIdFrom',
              value: submission.chainFrom.toString(),
            },
            {
              name: 'chainIdTo',
              value: submission.chainTo.toString(),
            },
            {
              name: 'nonce',
              value: submission.nonce.toString(),
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
        where: [
          {
            status: SubmisionStatusEnum.SIGNED,
            bundlrStatus: BundlrStatusEnum.NEW,
          },
          {
            status: SubmisionStatusEnum.SIGNED,
            bundlrStatus: IsNull(),
          },
        ],
      });

      for (const asset of assets) {
        this.logger.verbose(`Uploading asset to bundlr started ${asset.deployId}`);

        const bundlrTx = await this.arweaveService.upload(JSON.stringify(asset), [
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
