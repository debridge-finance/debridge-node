import { Injectable, Logger } from '@nestjs/common';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { ProcessNewTransferResult } from '../entities/ProcessNewTransferResult';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { NonceControllingService } from './NonceControllingService';
import { NonceValidationEnum } from '../enums/NonceValidationEnum';
import { ProcessNewTransferResultStatusEnum } from '../enums/ProcessNewTransferResultStatusEnum';
import { ChainConfigService } from '../../config/services/ChainConfigService';
import { ChainConfig } from '../../config/models/configs/ChainConfig';
import { Web3Custom } from '../../../web3/services/Web3Service';

@Injectable()
export class SubmissionProcessingService {
  constructor(
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    private readonly nonceControllingService: NonceControllingService,
    private readonly chainConfigService: ChainConfigService,
  ) {}

  async process(
    submissions: SubmissionEntity[],
    chainId: number,
    lastBlockOrNonceOfPage: number,
    web3?: Web3Custom,
  ): Promise<ProcessNewTransferResultStatusEnum> {
    const logger = new Logger(`${SubmissionProcessingService.name} chainId ${chainId}`);
    const chainDetail = this.chainConfigService.get(chainId);
    const result = await this.processNewTransfers(logger, submissions, chainDetail);
    const updatedBlockOrNonce: number | string =
      result.status === ProcessNewTransferResultStatusEnum.SUCCESS ? lastBlockOrNonceOfPage : result.blockOrNonceToOverwrite;

    // updatedBlock can be undefined if incorrect nonce occures in the first event
    if (updatedBlockOrNonce) {
      logger.log(`updateSupportedChainBlock; key: latestBlock; value: ${updatedBlockOrNonce};`);
      if (chainDetail.isSolana) {
        //check type
        const lastSubmission = await this.submissionsRepository.findOne({
          where: {
            nonce: updatedBlockOrNonce,
            chainFrom: chainId,
          },
        });
        await this.supportedChainRepository.update(chainId, {
          latestBlock: lastSubmission.blockNumber,
          latestNonce: lastSubmission.nonce,
          lastTxTimestamp: lastSubmission.blockTime,
          lastTransactionSlotNumber: lastSubmission.blockNumber,
          latestSolanaTransaction: lastSubmission.txHash,
        });
      } else {
        await this.supportedChainRepository.update(chainId, {
          latestBlock: updatedBlockOrNonce as number,
        });
      }
    }
    if (result.status !== ProcessNewTransferResultStatusEnum.SUCCESS) {
      await this.nonceControllingService.processValidationNonceError(result, chainId, web3, chainDetail);
    }
    return result.status;
  }

  /**
   * Process new transfers
   * @param logger
   * @param submissions
   * @param {ChainConfig} chainDetail
   * @private
   */
  async processNewTransfers(logger: Logger, submissions: SubmissionEntity[], chainDetail: ChainConfig): Promise<ProcessNewTransferResult> {
    const { chainId: chainIdFrom } = chainDetail;
    let blockOrNonceToOverwrite;

    for (const submission of submissions) {
      const submissionId = submission.submissionId;
      logger.log(`submissionId: ${submissionId}`);
      logger.verbose(`Processing ${submissionId} is started`);
      const nonce = submission.nonce;

      // check nonce collission
      // check if submission from rpc with the same submissionId have the same nonce
      const submissionInDb = await this.submissionsRepository.findOne({
        where: {
          submissionId,
        },
      });
      if (submissionInDb) {
        logger.verbose(`Submission already found in db submissionId: ${submissionId}`);
        blockOrNonceToOverwrite = this.getBlockNumberOrNonce(submissionInDb);
        this.nonceControllingService.setMaxNonce(chainIdFrom, submissionInDb.nonce);
        continue;
      }

      const chainMaxNonce = this.nonceControllingService.getMaxNonce(chainIdFrom);

      const submissionWithMaxNonceDb = await this.submissionsRepository.findOne({
        where: {
          chainFrom: chainIdFrom,
          nonce: chainMaxNonce,
        },
      });

      const submissionWithCurNonce = await this.submissionsRepository.findOne({
        where: {
          chainFrom: chainIdFrom,
          nonce,
        },
      });
      const nonceExists = !!submissionWithCurNonce;
      const nonceValidationStatus = this.nonceControllingService.validateNonce(chainMaxNonce, nonce, nonceExists);

      logger.verbose(`Nonce validation status ${nonceValidationStatus}; maxNonceFromDb: ${chainMaxNonce}; nonce: ${nonce};`);
      if (nonceValidationStatus !== NonceValidationEnum.SUCCESS) {
        const blockOrNonce = blockOrNonceToOverwrite !== undefined ? blockOrNonceToOverwrite : this.getBlockNumberOrNonce(submissionWithMaxNonceDb);
        const message = `Incorrect nonce (${nonceValidationStatus}) for nonce: ${nonce}; max nonce in db: ${chainMaxNonce}; submissionId: ${submissionId}; blockToOverwrite: ${blockOrNonceToOverwrite}; submissionWithMaxNonceDb.blockNumber: ${submissionWithMaxNonceDb?.blockNumber}`;
        logger.error(message);
        return {
          blockOrNonceToOverwrite: blockOrNonce, // it would be empty only if incorrect nonce occures in the first event
          status: ProcessNewTransferResultStatusEnum.ERROR,
          nonceValidationStatus,
          submissionId,
          nonce,
        };
      }

      try {
        logger.verbose(`Saving submission ${submissionId} is started`);
        await this.submissionsRepository.save(submission);
        logger.verbose(`Saving submission ${submissionId} is finished`);
        blockOrNonceToOverwrite = this.getBlockNumberOrNonce(submission);
        this.nonceControllingService.setMaxNonce(chainIdFrom, nonce);
      } catch (e) {
        logger.error(`Error in saving ${submissionId}`);
        throw e;
      }
      logger.verbose(`Processing ${submissionId} is started`);
    }
    return {
      status: ProcessNewTransferResultStatusEnum.SUCCESS,
    };
  }

  private getBlockNumberOrNonce(submission: SubmissionEntity): number {
    if (!submission) {
      return;
    }
    const chainDetail = this.chainConfigService.get(submission.chainFrom);
    if (chainDetail?.isSolana) {
      return submission.nonce;
    } else {
      return submission.blockNumber;
    }
  }
}
