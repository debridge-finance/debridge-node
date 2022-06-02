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
import { MonitoringSentEventEntity } from '../../../../entities/MonitoringSentEventEntity';

@Injectable()
export class SubmissionProcessingService {
  constructor(
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    @InjectRepository(MonitoringSentEventEntity)
    private readonly monitoringSentEventsRepository: Repository<MonitoringSentEventEntity>,
    private readonly nonceControllingService: NonceControllingService,
    private readonly chainConfigService: ChainConfigService,
  ) {}

  async process(
    submissions: SubmissionEntity[],
    monitoringSentEvents: MonitoringSentEventEntity[],
    chainId: number,
    lastBlockOrTransactionOfPage: number | string,
    web3?: Web3Custom,
  ) {
    const logger = new Logger(`${SubmissionProcessingService.name} chainId ${chainId}`);
    const chainDetail = this.chainConfigService.get(chainId);
    const result = await this.processNewTransfers(logger, submissions, monitoringSentEvents, chainDetail);
    const updatedBlockOrTransaction: number | string =
      result.status === ProcessNewTransferResultStatusEnum.SUCCESS ? lastBlockOrTransactionOfPage : result.blockOrTransactionToOverwrite;

    // updatedBlock can be undefined if incorrect nonce occures in the first event
    if (updatedBlockOrTransaction) {
      logger.log(`updateSupportedChainBlock; key: latestBlock; value: ${updatedBlockOrTransaction};`);
      if (chainDetail.isSolana) {
        //check type
        await this.supportedChainRepository.update(chainId, {
          latestSolanaTransaction: updatedBlockOrTransaction as string,
          validationTimestamp: result.validationTimestamp,
        });
      } else {
        await this.supportedChainRepository.update(chainId, {
          latestBlock: updatedBlockOrTransaction as number,
          validationTimestamp: result.validationTimestamp,
        });
      }
    }
    if (result.status !== ProcessNewTransferResultStatusEnum.SUCCESS) {
      await this.nonceControllingService.processValidationNonceError(result, chainId, web3, chainDetail);
    }
  }

  //check is solana

  /**
   * Process new transfers
   * @param logger
   * @param submissions
   * @param monitoringSentEvents
   * @param {ChainConfig} chainDetail
   * @private
   */
  async processNewTransfers(
    logger: Logger,
    submissions: SubmissionEntity[],
    monitoringSentEvents: MonitoringSentEventEntity[],
    chainDetail: ChainConfig,
  ): Promise<ProcessNewTransferResult> {
    const { chainId: chainIdFrom } = chainDetail;
    let blockOrTransactionToOverwrite;

    const monitoringSentEventsMap = new Map<string, any>();
    for (const event of monitoringSentEvents) {
      monitoringSentEventsMap.set(event.submissionId, event);
    }

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
      const monitoringInDb = await this.monitoringSentEventsRepository.findOne({
        where: {
          submissionId,
          nonce: submission.nonce,
        },
      });

      if (submissionInDb && monitoringInDb) {
        logger.verbose(`Submission already found in db submissionId: ${submissionId}`);
        blockOrTransactionToOverwrite = this.getBlockNumberOrTransaction(submissionInDb);
        this.nonceControllingService.setMaxNonce(chainIdFrom, submissionInDb.nonce);
        continue;
      }

      if (submissionInDb && submissionInDb.blockNumber < chainDetail.firstMonitoringBlock) {
        logger.verbose(`Submission already found in db; submissionId: ${submissionId}`);
        blockOrTransactionToOverwrite = this.getBlockNumberOrTransaction(submissionInDb);
        this.nonceControllingService.setMaxNonce(chainIdFrom, submission.nonce);
        continue;
      }

      // validate nonce
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
        const blockOrTransaction =
          blockOrTransactionToOverwrite !== undefined ? blockOrTransactionToOverwrite : this.getBlockNumberOrTransaction(submissionWithMaxNonceDb);
        const message = `Incorrect nonce (${nonceValidationStatus}) for nonce: ${nonce}; max nonce in db: ${chainMaxNonce}; submissionId: ${submissionId}; blockToOverwrite: ${blockOrTransactionToOverwrite}; submissionWithMaxNonceDb.blockNumber: ${submissionWithMaxNonceDb.blockNumber}`;
        logger.error(message);
        return {
          blockOrTransactionToOverwrite: blockOrTransaction, // it would be empty only if incorrect nonce occures in the first event
          status: ProcessNewTransferResultStatusEnum.ERROR,
          nonceValidationStatus,
          submissionId,
          nonce,
        };
      }

      if (submission.blockNumber >= chainDetail.firstMonitoringBlock) {
        const monitoringSentEvent = monitoringSentEventsMap.get(submissionId);
        if (!monitoringSentEvent || monitoringSentEvent.nonce !== nonce) {
          logger.error(`Monitoring event for submissionId: ${submissionId}; with nonce: ${nonce} not found;`);
          return {
            blockOrTransactionToOverwrite: this.getBlockNumberOrTransaction(submission), // it would be empty only if incorrect nonce occures in the first event
            status: ProcessNewTransferResultStatusEnum.ERROR,
            submissionId,
            nonce,
          };
        }
        await this.saveMonitoringEvents(monitoringSentEvent, logger);
      }

      try {
        logger.verbose(`Saving submission ${submissionId} is started`);
        await this.submissionsRepository.save(submission);
        logger.verbose(`Saving submission ${submissionId} is finished`);
        blockOrTransactionToOverwrite = this.getBlockNumberOrTransaction(submission);
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

  private getBlockNumberOrTransaction(submission: SubmissionEntity): number | string {
    if (!submission) {
      return;
    }
    const chainDetail = this.chainConfigService.get(submission.chainFrom);
    if (chainDetail?.isSolana) {
      return submission.txHash;
    } else {
      return submission.blockNumber;
    }
  }

  private async saveMonitoringEvents(monitoringEvent: MonitoringSentEventEntity, logger: Logger) {
    try {
      await this.monitoringSentEventsRepository.save(monitoringEvent);
    } catch (e) {
      logger.error(`Error in saving monitoringSentEvent submissionId: ${monitoringEvent.submissionId}; nonce: ${monitoringEvent.nonce}`);
      throw e;
    }
    logger.verbose(`Monitoring event for submissionId: ${monitoringEvent.submissionId}; with nonce: ${monitoringEvent.nonce} was added to the db;`);
  }
}
