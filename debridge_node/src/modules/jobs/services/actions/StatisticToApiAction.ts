import { Injectable, Logger } from '@nestjs/common';
import { IAction } from './IAction';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DebrdigeApiService } from '../../../external/debridge_api/services/DebrdigeApiService';
import { SupportedChainEntity } from '../../../../entities/SupportedChainEntity';
import { ProgressInfoDTO } from '../../../external/debridge_api/dto/request/ValidationProgressDTO';
import { ChainConfigService } from '../../../chain/config/services/ChainConfigService';
import { readConfiguration } from '../../../../utils/readConfiguration';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StatisticToApiAction extends IAction {
  constructor(
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    private readonly chainConfigService: ChainConfigService,
    private readonly debridgeApiService: DebrdigeApiService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.logger = new Logger(StatisticToApiAction.name);
  }

  async process(): Promise<void> {
    const apiBaseUrl = readConfiguration(this.configService, this.logger, 'API_BASE_URL');
    if (!apiBaseUrl && apiBaseUrl === '') {
      return;
    }

    this.logger.log(`process StatisticToApiAction is started`);
    const chains = await this.supportedChainRepository.find();
    this.logger.debug('chains are found');
    const progressInfo = await Promise.all(
      chains.map(async chain => {
        const chainConfig = this.chainConfigService.get(chain.chainId);
        if (chainConfig && chainConfig.isSolana) {
          return {
            chainId: chain.chainId,
            lastBlock: chain.latestBlock,
            lastTxHash: chain.latestSolanaTransaction,
            lastTransactionSlotNumber: chain.lastTransactionSlotNumber,
            latestNonce: chain.latestNonce,
            lastTxTimestamp: chain.lastTxTimestamp,
          } as ProgressInfoDTO;
        }
        return { chainId: chain.chainId, lastBlock: chain.latestBlock } as ProgressInfoDTO;
      }),
    );
    await this.debridgeApiService.uploadStatistic(progressInfo);

    this.logger.log(`process StatisticToApiAction is finished`);
  }
}
