import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { SolanaApiService } from '../../../external/solana_api/services/SolanaApiService';
import { TransformService } from './TransformService';
import { ConfigService } from '@nestjs/config';
import { SubmissionProcessingService } from './SubmissionProcessingService';

/**
 * Service for reading transaction from solana
 */
@Injectable()
export class SolanaReaderService {
  private readonly logger = new Logger(SupportedChainEntity.name);
  private readonly GET_HISTORICAL_LIMIT: number;

  constructor(
    private readonly solanaApiService: SolanaApiService,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    private readonly transformService: TransformService,
    private readonly configService: ConfigService,
    private readonly chainProcessingService: SubmissionProcessingService,
  ) {
    this.GET_HISTORICAL_LIMIT = parseInt(this.configService.get('SOLANA_TRANSACTION_BATCH_SIZE'));
  }

  /**
   * Sync transactions
   * @param {string} chainId
   */
  async syncTransactions(chainId: number) {
    const chain = await this.supportedChainRepository.findOne({
      where: {
        chainId,
      },
    });
    if (!chain) {
      this.logger.warn(`Solana chain is not found`);
    }
    const latestTransactionInChain = (await this.solanaApiService.getHistoricalData(1))[0]; // get latest transaction
    let earliestTransactionInSyncSession = undefined;
    const previousSyncLastTransaction = chain.latestSolanaTransaction;

    if (latestTransactionInChain === previousSyncLastTransaction) {
      this.logger.log(`Chain ${chainId} is synced`);
      return;
    }

    const submissions: SubmissionEntity[] = [];

    let transactions;
    do {
      transactions = await this.solanaApiService.getHistoricalData(
        this.GET_HISTORICAL_LIMIT,
        earliestTransactionInSyncSession,
        previousSyncLastTransaction,
      );
      if (transactions.length === 0) {
        this.logger.log(`Chain ${chainId} is synced`);
        break;
      }
      this.logger.verbose(`Transactions ${transactions.length} are received`);
      const events = await this.solanaApiService.getEventsFromTransactions(transactions);
      this.logger.verbose(`Events ${events.length} from transaction are received`);
      events.sort((a, b) => b.nonce - a.nonce); //sort
      earliestTransactionInSyncSession = events.at(-1).transactionHash; // get earliest from batch
      //events for saving in database
      const eventsForSave = events.map(event => {
        try {
          const submission = this.transformService.generateSubmissionFromSolanaEvent(event);
          this.logger.verbose(`submission ${event.submissionId} is generated`);
          return submission;
        } catch (e) {
          this.logger.error(`Can't generate submission ${event.submissionId} from solana event`);
          throw e;
        }
      });
      this.logger.verbose(`Events ${eventsForSave.length} are prepared for db storing`);
      submissions.push(...eventsForSave);
      this.logger.log(`submission ${JSON.stringify(eventsForSave)} is stored`);
      this.logger.log(`searchFrom = ${earliestTransactionInSyncSession}`);
    } while (transactions.length === this.GET_HISTORICAL_LIMIT);

    submissions.sort((a, b) => a.nonce - b.nonce); //sort
    if (submissions.length > 0) {
      await this.chainProcessingService.process(submissions, chainId, submissions.at(-1).txHash);
    }
  }
}
