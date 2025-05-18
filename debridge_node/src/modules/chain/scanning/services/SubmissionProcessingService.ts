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
import { SubmissionIdValidationService } from './SubmissionIdValidationService';
import { MonitoringSendEventEntity } from '../../../../entities/MonitoringSendEventEntity';

@Injectable()
export class SubmissionProcessingService {

  readonly #supportedChainRepository: Repository<SupportedChainEntity>;
  readonly #submissionsRepository: Repository<SubmissionEntity>;
  readonly #monitoringSendEventRepository: Repository<MonitoringSendEventEntity>;
  readonly #nonceControllingService: NonceControllingService;
  readonly #chainConfigService: ChainConfigService;
  readonly #submissionIdValidationService: SubmissionIdValidationService;

  constructor(
    @InjectRepository(SupportedChainEntity)
    supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(MonitoringSendEventEntity)
    monitoringSendEventRepository: Repository<MonitoringSendEventEntity>,
    nonceControllingService: NonceControllingService,
    chainConfigService: ChainConfigService,
    submissionIdValidationService: SubmissionIdValidationService,
  ) {
    this.#supportedChainRepository = supportedChainRepository;
    this.#submissionsRepository = submissionsRepository;
    this.#monitoringSendEventRepository = monitoringSendEventRepository;
    this.#nonceControllingService = nonceControllingService;
    this.#chainConfigService = chainConfigService;
    this.#submissionIdValidationService = submissionIdValidationService;
  }

  async process(
    submissions: SubmissionEntity[],
    monitoringEvents: MonitoringSendEventEntity[],
    chainId: number,
    lastBlockOrNonceOfPage: number,
    web3?: Web3Custom,
  ): Promise<ProcessNewTransferResultStatusEnum> {
    const logger = new Logger(`${SubmissionProcessingService.name} chainId ${chainId}`);
    const chainDetail = this.#chainConfigService.get(chainId);
    const result = await this.processNewTransfers(logger, submissions, monitoringEvents, chainDetail);
    const updatedBlockOrNonce: number | string =
      result.status === ProcessNewTransferResultStatusEnum.SUCCESS ? lastBlockOrNonceOfPage : result.blockOrNonceToOverwrite;

    // updatedBlock can be undefined if incorrect nonce occures in the first event
    if (updatedBlockOrNonce) {
      logger.log(`updateSupportedChainBlock; key: latestBlock; value: ${updatedBlockOrNonce};`);
      if (chainDetail.isSolana) {
        //check type
        const lastSubmission = await this.#submissionsRepository.findOne({
          where: {
            nonce: updatedBlockOrNonce,
            chainFrom: chainId,
          },
        });
        await this.#supportedChainRepository.update(chainId, {
          latestBlock: lastSubmission.blockNumber,
          latestNonce: lastSubmission.nonce,
          lastTxTimestamp: lastSubmission.blockTime,
          lastTransactionSlotNumber: lastSubmission.blockNumber,
          latestSolanaTransaction: lastSubmission.txHash,
        });
      } else {
        await this.#supportedChainRepository.update(chainId, {
          latestBlock: updatedBlockOrNonce as number,
        });
      }
    }
    switch (result.status) {
      case ProcessNewTransferResultStatusEnum.ERROR_NONCE_VALIDATION: {
        await this.#nonceControllingService.processValidationNonceError(result, chainId, web3, chainDetail);
        break;
      }
      case ProcessNewTransferResultStatusEnum.ERROR_SUBMISSION_VALIDATION: {
        await this.#submissionIdValidationService.processValidationSubmissionIdError(
          web3,
          chainDetail,
          result.submissionId,
          result.calculatedSubmissionId,
        );
        break;
      }
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
  async processNewTransfers(
    logger: Logger,
    submissions: SubmissionEntity[],
    monitoringEvents: MonitoringSendEventEntity[],
    chainDetail: ChainConfig,
  ): Promise<ProcessNewTransferResult> {
    const { chainId: chainIdFrom } = chainDetail;
    let blockOrNonceToOverwrite;
    const groupedMonitoringEvents = monitoringEvents.reduce((acc, item) => {
      const key = item.submissionId;
      acc[key] = item;
      return acc;
    }, {});

    for (const submission of submissions) {
      const submissionId = submission.submissionId;
      logger.log(`submissionId: ${submissionId}`);
      logger.verbose(`Processing ${submissionId} is started`);
      const nonce = submission.nonce;

      // check nonce collission
      // check if submission from rpc with the same submissionId have the same nonce
      const submissionInDb = await this.#submissionsRepository.findOne({
        where: {
          submissionId,
        },
      });
      if (submissionInDb) {
        logger.verbose(`Submission already found in db submissionId: ${submissionId}`);
        blockOrNonceToOverwrite = this.getBlockNumberOrNonce(submissionInDb);
        this.#nonceControllingService.setMaxNonce(chainIdFrom, submissionInDb.nonce);
        await this.#processMonitoringEvents(groupedMonitoringEvents[submissionId], logger);
        continue;
      }

      const chainMaxNonce = this.#nonceControllingService.getMaxNonce(chainIdFrom);

      const submissionWithMaxNonceDb = await this.#submissionsRepository.findOne({
        where: {
          chainFrom: chainIdFrom,
          nonce: chainMaxNonce,
        },
      });

      const submissionWithCurNonce = await this.#submissionsRepository.findOne({
        where: {
          chainFrom: chainIdFrom,
          nonce,
        },
      });
      const nonceExists = !!submissionWithCurNonce;
      const nonceValidationStatus = this.#nonceControllingService.validateNonce(chainMaxNonce, nonce, nonceExists);

      logger.verbose(`Nonce validation status ${nonceValidationStatus}; maxNonceFromDb: ${chainMaxNonce}; nonce: ${nonce};`);
      if (nonceValidationStatus !== NonceValidationEnum.SUCCESS) {
        const blockOrNonce = blockOrNonceToOverwrite !== undefined ? blockOrNonceToOverwrite : this.getBlockNumberOrNonce(submissionWithMaxNonceDb);
        const message = `Incorrect nonce (${nonceValidationStatus}) for nonce: ${nonce}; max nonce in db: ${chainMaxNonce}; submissionId: ${submissionId}; blockToOverwrite: ${blockOrNonceToOverwrite}; submissionWithMaxNonceDb.blockNumber: ${submissionWithMaxNonceDb?.blockNumber}`;
        logger.error(message);
        return {
          blockOrNonceToOverwrite: blockOrNonce, // it would be empty only if incorrect nonce occures in the first event
          status: ProcessNewTransferResultStatusEnum.ERROR_NONCE_VALIDATION,
          nonceValidationStatus,
          submissionId,
          nonce,
        };
      }

      const submissionIdValidation = await this.#submissionIdValidationService.validate(submission);
      if (!submissionIdValidation.status) {
        return {
          status: ProcessNewTransferResultStatusEnum.ERROR_SUBMISSION_VALIDATION,
          nonceValidationStatus,
          submissionId,
          nonce,
          calculatedSubmissionId: submissionIdValidation.calculatedSubmissionId,
        };
      }

      try {
        logger.verbose(`Saving submission ${submissionId} is started`);
        await this.#submissionsRepository.save(submission);
        logger.verbose(`Saving submission ${submissionId} is finished`);
        await this.#processMonitoringEvents(groupedMonitoringEvents[submissionId], logger);
        blockOrNonceToOverwrite = this.getBlockNumberOrNonce(submission);
        this.#nonceControllingService.setMaxNonce(chainIdFrom, nonce);
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

  /**
   * Process monitoring events for a submission
   * @param event Monitoring event to process
   * @param logger Logger instance for logging
   */
  async #processMonitoringEvents(event: MonitoringSendEventEntity, logger: Logger): Promise<void> {
    if (!event) {
      logger.error(`Monitoring event is empty`);
      throw new Error(`Monitoring event is empty`);
    }
    try {
      const exists = await this.#monitoringSendEventRepository.exists({
        where: { submissionId: event.submissionId }
      });

      if (!exists) {
        await this.#monitoringSendEventRepository.save(event);
        logger.verbose(`Saved monitoring event for submission ${event.submissionId}`);
      } else {
        logger.verbose(`Monitoring event for submission ${event.submissionId} already exists`);
      }
    } catch (error) {
      logger.error(`Error processing monitoring event for submission ${event.submissionId}: ${error.message}`);
      throw error;
    }
  }

  private getBlockNumberOrNonce(submission: SubmissionEntity): number {
    if (!submission) {
      return;
    }
    const chainDetail = this.#chainConfigService.get(submission.chainFrom);
    if (chainDetail?.isSolana) {
      return submission.nonce;
    } else {
      return submission.blockNumber;
    }
  }
}
