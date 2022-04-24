import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ChainConfigService } from '../../../config/services/ChainConfigService';
import { SolanaApiService } from './SolanaApiService';
import { SupportedChainEntity } from '../../../../../entities/SupportedChainEntity';
import { TransformService } from '../TransformService';
import { SolanaSyncEntity } from '../../../../../entities/SolanaSyncEntity';
import { SubmissionEntity } from '../../../../../entities/SubmissionEntity';
import { ConfigService } from '@nestjs/config';
import { EventFromTransaction } from '../../dto/response/get.events.from.transactions.response.dto';

@Injectable()
export class SolanaUploadOldService implements OnModuleInit {
  private readonly logger = new Logger(SolanaUploadOldService.name);
  private readonly GET_HISTORICAL_LIMIT: number;

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly chainConfigService: ChainConfigService,
    private readonly solanaApiService: SolanaApiService,
    private readonly transformService: TransformService,
    private readonly configService: ConfigService,
  ) {
    this.GET_HISTORICAL_LIMIT = parseInt(this.configService.get('SOLANA_TRANSACTION_BATCH_SIZE'));
  }

  async onModuleInit() {
    try {
      const chainId = this.chainConfigService.getSolanaChainId();

      await this.generateSolanaSyncEntity(chainId);
      const isSolana = await this.storeConfig(chainId);
      if (!isSolana) {
        return;
      }

      while (true) {
        const { earliestTransaction } = await this.entityManager.findOne(SolanaSyncEntity, {
          where: {
            chainId,
          },
        });
        const signatures = await this.solanaApiService.getHistoricalData(this.GET_HISTORICAL_LIMIT, earliestTransaction);
        if (signatures.length === 0) {
          this.logger.log(`Solana ${chainId} is synced`);
          await this.entityManager.update(SolanaSyncEntity, chainId, {
            synced: true,
          });
          break;
        }
        const transactions = await this.solanaApiService.getEventsFromTransactions(signatures);
        transactions.sort((a, b) => b.nonce - a.nonce);

        for (const transaction of transactions) {
          try {
            await this.entityManager.transaction(manager => this.storeEvent(manager, transaction));
          } catch (e) {
            this.logger.error(`Error in storing submission ${transaction.submissionId}: ${e.message}`);
            throw e;
          }
        }
      }
    } catch (e) {
      this.logger.error(`Solana syncing is failed ${e.message}`);
    }
  }

  private async storeEvent(manager: EntityManager, transaction: EventFromTransaction) {
    const submissionDb = await manager.findOne(SubmissionEntity,{
      submissionId: transaction.submissionId,
    });
    if (submissionDb) {
      this.logger.verbose(`Submission already found in db submissionId: ${transaction.submissionId}`);
      return;
    }
    const submission = this.transformService.generateSubmissionFromSolanaEvent(transaction);

    await manager.findOne(SubmissionEntity, submission);
    this.logger.log(`submission ${submission.submissionId} is stored`);
    await manager.update(SolanaSyncEntity, submission.chainFrom, {
      earliestTransaction: submission.txHash,
    });
    this.logger.log(`latestSolanaTransaction = ${submission.txHash}`);
  }

  private async generateSolanaSyncEntity(chainId: number) {
    const solanaSync = await this.entityManager.findOne(SolanaSyncEntity, {
      chainId,
    });
    if (solanaSync && solanaSync.synced) {
      this.logger.log(`Solana chain is synced`);
      return;
    }
    if (!solanaSync) {
      await this.entityManager.save(SolanaSyncEntity, {
        chainId,
        synced: false,
      });
    }
  }

  private async storeConfig(chainId: number) {
    const chain = this.chainConfigService.get(chainId);
    if (!chain) {
      this.logger.log(`Not exists solana chain ${chainId} in config`);
      return false;
    }
    const supportedChain = await this.entityManager.findOne(SupportedChainEntity,{
      where: {
        chainId: chainId,
      },
    });
    if (!supportedChain) {
      const latestSolanaTransaction = (await this.solanaApiService.getHistoricalData(1))[0];

      await this.entityManager.save(SupportedChainEntity, {
        chainId: chainId,
        network: chain.name,
        latestSolanaTransaction,
      });
    }
    return true;
  }
}
