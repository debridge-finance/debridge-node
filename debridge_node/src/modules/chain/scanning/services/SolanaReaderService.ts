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
import { ProcessNewTransferResultStatusEnum } from '../enums/ProcessNewTransferResultStatusEnum';
import { setTimeout } from 'timers/promises';

/**
 * Service for reading transaction from solana
 */
@Injectable()
export class SolanaReaderService {
  private readonly logger = new Logger(SolanaReaderService.name);
  private readonly GET_HISTORICAL_LIMIT: number;
  private readonly GET_EVENTS_LIMIT: number;
  private readonly SOLANA_API_WAIT_BATCH_INTERVAL: number;

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
    this.SOLANA_API_WAIT_BATCH_INTERVAL = parseInt(configService.get('SOLANA_API_WAIT_BATCH_INTERVAL') || '1000');
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

    let transactionsHashes: string[] = [];
    let batchTransactionsHashes: string[];
    do {
      batchTransactionsHashes = await this.solanaApiService.getHistoricalData(
        this.GET_HISTORICAL_LIMIT,
        earliestTransactionInSyncSession,
        previousSyncLastTransaction,
      );
      if (batchTransactionsHashes.length === 0) {
        this.logger.log(`Chain ${chainId} is synced`);
        break;
      }
      this.logger.verbose(`Transactions ${batchTransactionsHashes.length} are received`);
      transactionsHashes.push(...batchTransactionsHashes);
      earliestTransactionInSyncSession = batchTransactionsHashes.at(-1); // get earliest from batch

      this.logger.log(`searchFrom = ${earliestTransactionInSyncSession}`);
    } while (batchTransactionsHashes.length === this.GET_HISTORICAL_LIMIT); //getting all transactions

    if (transactionsHashes.length === 0) {
      await this.supportedChainRepository.update(
        { chainId },
        {
          latestBlock: lastSolanaBlock,
        },
      );
      return;
    }

    transactionsHashes = transactionsHashes.reverse(); //sort for having transaction from earliest to newest

    //saving transactions
    const eventSyncingPageCount = Math.ceil(transactionsHashes.length / this.GET_EVENTS_LIMIT);
    for (let pageNumber = 0; pageNumber < eventSyncingPageCount; pageNumber++) {
      const skip = pageNumber * this.GET_EVENTS_LIMIT;
      const end = Math.min((pageNumber + 1) * this.GET_EVENTS_LIMIT, transactionsHashes.length);
      const txs = transactionsHashes.slice(skip, end);
      this.logger.log(`Tx hashes for scan ${JSON.stringify(txs)}`);
      const transactions = await this.solanaApiService.getEventsFromTransactions(txs);
      const events = [];
      transactions
        .filter(transaction => transaction.transactionState === TransactionState.Ok)
        .forEach(transaction => {
          transaction.events.forEach(event => {
            events.push({
              ...event,
              transactionHash: transaction.transactionHash,
              slotNumber: transaction.slotNumber,
            } as SolanaEvent);
          });
        });
      this.logger.verbose(`Events ${events.length} from transaction are received`);

      const submissions = events.map(event => {
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

      //sort in asc, we need it for correct updating last tracked value and nonce validation
      submissions.sort((a, b) => a.nonce - b.nonce);
      this.logger.verbose(`Events ${submissions.length} are prepared for db storing`);

      if (submissions.length > 0) {
        const result = await this.chainProcessingService.process(submissions, chainId, submissions.at(-1).txHash);
        if (result !== ProcessNewTransferResultStatusEnum.SUCCESS) {
          break;
        }
      } else {
        this.logger.log(`There are no success transaction`);
        const lastTransactionInBatch = transactions.at(-1);
        if (lastTransactionInBatch) {
          await this.supportedChainRepository.update(chainId, {
            latestSolanaTransaction: lastTransactionInBatch.transactionHash,
            latestBlock: lastTransactionInBatch.slotNumber,
            lastTxTimestamp: lastTransactionInBatch.transactionTimestamp.toString(),
            lastTransactionSlotNumber: lastTransactionInBatch.slotNumber,
          });
          this.logger.log(
            `updateSupportedChainBlock; transactionHash: ${lastTransactionInBatch.transactionHash}; slotNumber: ${lastTransactionInBatch.slotNumber};`,
          );
        }
      }
      this.logger.verbose(`Waiting ${this.SOLANA_API_WAIT_BATCH_INTERVAL}`); //need for sync events from reader
      await setTimeout(this.SOLANA_API_WAIT_BATCH_INTERVAL);
    }
  }
}
