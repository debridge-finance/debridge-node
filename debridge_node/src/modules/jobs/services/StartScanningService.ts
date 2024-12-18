import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SignAction } from './actions/SignAction';
import { UploadToApiAction } from './actions/UploadToApiAction';
import { StatisticToApiAction } from './actions/StatisticToApiAction';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { Web3Service } from '../../web3/services/Web3Service';
import { ChainScanningService } from '../../chain/scanning/services/ChainScanningService';
import { ChainConfigService } from '../../chain/config/services/ChainConfigService';
import { EvmChainConfig } from '../../chain/config/models/configs/EvmChainConfig';
import { SolanaChainConfig } from '../../chain/config/models/configs/SolanaChainConfig';

@Injectable()
export class StartScanningService implements OnModuleInit {
  private readonly logger = new Logger(StartScanningService.name);

  constructor(
    private readonly signAction: SignAction,
    private readonly uploadToApiAction: UploadToApiAction,
    private readonly statisticToApiAction: StatisticToApiAction,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    private readonly web3Service: Web3Service,
    private readonly chainScanningService: ChainScanningService,
    private readonly chainConfigService: ChainConfigService,
  ) {}

  private async uploadConfig() {
    for (const chainId of this.chainConfigService.getChains()) {
      const chainConfig = this.chainConfigService.get(chainId);
      const configInDd = await this.supportedChainRepository.findOne({
        where: {
          chainId: chainId,
        },
      });
      if (chainConfig.isSolana) {
        if (!configInDd) {
          const chainConfigSolana = chainConfig as SolanaChainConfig;
          await this.supportedChainRepository.save({
            chainId: chainId,
            latestBlock: 0,
            latestNonce: chainConfigSolana.firstStartNonce,
            network: chainConfigSolana.name,
          });
        }
        continue;
      }
      const chainConfigEvm = chainConfig as EvmChainConfig;
      if (chainConfigEvm.maxBlockRange < 50) {
        this.logger.error(`Cant up application maxBlockRange(${chainConfigEvm.maxBlockRange}) < 50`);
        process.exit(1);
      }
      if (chainConfigEvm.blockConfirmation <= 8) {
        this.logger.error(`Cant up application maxBlockRange(${chainConfigEvm.blockConfirmation}) < 8`);
        process.exit(1);
      }

      if (!configInDd) {
        await this.supportedChainRepository.save({
          chainId: chainId,
          latestBlock: chainConfigEvm.firstStartBlock,
          network: chainConfigEvm.name,
        });
      }
    }
  }

  private async setupCheckEventsTimeout() {
    const chains = await this.supportedChainRepository.find();

    for (const chain of chains) {
      try {
        const chainDetail = this.chainConfigService.get(chain.chainId);
        if (!chainDetail) {
          this.logger.error(`${chain.chainId} ChainId from chains_config are not the same with the value from db`);
          continue;
        }
        if (chainDetail.isSolana) {
          continue;
        }
        const chainConfigEvm = chainDetail as EvmChainConfig;
        await Promise.all(
          chainConfigEvm.providers.getAllProviders().map(provider => {
            return this.web3Service.validateChainId(chainConfigEvm, provider);
          }),
        );
      } catch (e) {
        this.logger.error(`Error in validation configs for chain ${chain.chainId}: ${e.message}`);
        process.exit(1);
      }
    }

    for (const chain of chains) {
      const chainDetails = await this.chainConfigService.get(chain.chainId);
      if (!chainDetails) {
        this.logger.warn(`Chain ${chain.chainId} is skipped. It's presented in database but not in config.`);
        continue;
      }
      this.chainScanningService.start(chain.chainId);
    }
  }

  async onModuleInit() {
    await this.uploadConfig();
    await this.setupCheckEventsTimeout();
  }
}
