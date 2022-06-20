import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DebrdigeApiService } from '../../../external/debridge_api/services/DebrdigeApiService';
import { SupportedChainEntity } from '../../../../entities/SupportedChainEntity';
import { ProgressInfoDTO } from '../../../external/debridge_api/dto/request/ValidationProgressDTO';
import { ChainConfigService } from '../../../chain/config/services/ChainConfigService';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';

@Injectable()
export class StatisticToApiAction extends IAction {
  constructor(
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepository: Repository<SubmissionEntity>,
    private readonly chainConfigService: ChainConfigService,
    private readonly debridgeApiService: DebrdigeApiService,
  ) {
    super();
    this.logger = new Logger(StatisticToApiAction.name);
  }

  async process(): Promise<void> {
    this.logger.log(`process StatisticToApiAction is started`);
    const chains = await this.supportedChainRepository.find();
    this.logger.debug('chains are found');
    const progressInfo = await Promise.all(
      chains.map(async chain => {
        const chainConfig = this.chainConfigService.get(chain.chainId);
        if (chainConfig.isSolana) {
          const submission = await this.submissionRepository.findOne({
            where: {
              txHash: chain.latestSolanaTransaction,
            },
          });
          const event = JSON.parse(submission.rawEvent);
          return {
            chainId: chain.chainId,
            lastTxHash: chain.latestSolanaTransaction,
            lastTransactionSlotNumber: event.slotNumber,
            lastTxTimestamp: event.transactionTimestamp,
          } as ProgressInfoDTO;
        }
        return { chainId: chain.chainId, lastBlock: chain.latestBlock } as ProgressInfoDTO;
      }),
    );
    await this.debridgeApiService.uploadStatistic(progressInfo);

    this.logger.log(`process StatisticToApiAction is finished`);
  }
}
