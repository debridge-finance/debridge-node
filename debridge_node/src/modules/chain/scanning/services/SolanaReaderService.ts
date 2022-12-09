import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { SolanaApiService } from '../../../external/solana_api/services/SolanaApiService';
import { SolanaEvent, TransformService } from './TransformService';
import { ConfigService } from '@nestjs/config';
import { SubmissionProcessingService } from './SubmissionProcessingService';
import { readConfiguration } from '../../../../utils/readConfiguration';
import { TransactionState } from '../../../external/solana_api/dto/response/get.events.from.transactions.response.dto';

/**
 * Service for reading transaction from solana
 */
@Injectable()
export class SolanaReaderService {
  private readonly logger = new Logger(SolanaReaderService.name);
  private readonly GET_HISTORICAL_LIMIT: number;
  private readonly GET_EVENTS_LIMIT: number;

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
    this.GET_HISTORICAL_LIMIT = parseInt(readConfiguration(configService, this.logger, 'SOLANA_GET_HISTORICAL_BATCH_SIZE'));
    this.GET_EVENTS_LIMIT = parseInt(readConfiguration(configService, this.logger, 'SOLANA_GET_EVENTS_BATCH_SIZE'));
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
    const lastSolanaBlock = await this.solanaApiService.getLastBlock();
    this.logger.verbose(`lastSolanaBlock = ${lastSolanaBlock}`);

    const latestTransactionInChain = (await this.solanaApiService.getHistoricalData(1))[0]; // get latest transaction
    let earliestTransactionInSyncSession = undefined;
    const previousSyncLastTransaction = chain.latestSolanaTransaction;

    if (latestTransactionInChain === previousSyncLastTransaction) {
      this.logger.log(`Chain ${chainId} is synced`);
      await this.supportedChainRepository.update(
        { chainId },
        {
          latestBlock: lastSolanaBlock,
        },
      );
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

      const events = [];
      const size = Math.ceil(transactions.length / this.GET_EVENTS_LIMIT);
      for (let pageNumber = 0; pageNumber < size; pageNumber++) {
        const skip = pageNumber * this.GET_EVENTS_LIMIT;
        const end = Math.min((pageNumber + 1) * this.GET_EVENTS_LIMIT, transactions.length);
        const batchTransactions = await this.solanaApiService.getEventsFromTransactions(transactions.slice(skip, end));
        const batchEvents = [];
        batchTransactions
          .filter(transaction => transaction.transactionState === TransactionState.Ok)
          .forEach(transaction => {
            transaction.events.forEach(event => {
              batchEvents.push({
                ...event,
                transactionHash: transaction.transactionHash,
                slotNumber: transaction.slotNumber,
              } as SolanaEvent);
            });
          });
        events.push(...batchEvents);
        this.logger.verbose(`Events ${batchEvents.length} from transaction are received`);
      }

      //sort in desc, we need it for correct reading data from solana
      events.sort((a, b) => b.nonce - a.nonce);
      earliestTransactionInSyncSession = transactions.at(-1); // get earliest from batch
      //events for saving in database
      const eventsForSave = events.map(event => {
        try {
          const submission = this.transformService.generateSubmissionFromSolanaEvent(event);
          this.logger.verbose(`submission ${event.submissionId} is generated`);
          return submission;
        } catch (e) {
          this.logger.error(`Can't generate submission ${event.submissionId} from solana event`);
          this.logger.error(e);
          throw e;
        }
      });
      this.logger.verbose(`Events ${eventsForSave.length} are prepared for db storing`);
      submissions.push(...eventsForSave);
      this.logger.log(`submission ${JSON.stringify(eventsForSave)} is stored`);
      this.logger.log(`searchFrom = ${earliestTransactionInSyncSession}`);
    } while (transactions.length === this.GET_HISTORICAL_LIMIT);

    //sort in asc, we need it for correct updating last tracked value and nonxe validation
    submissions.sort((a, b) => a.nonce - b.nonce);
    if (submissions.length > 0) {
      await this.chainProcessingService.process(submissions, chainId, submissions.at(-1).txHash);
    }
    await this.supportedChainRepository.update(
      { chainId },
      {
        latestBlock: lastSolanaBlock,
      },
    );
  }
}
