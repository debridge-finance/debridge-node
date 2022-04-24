import { Injectable } from '@nestjs/common';
import chainConfigs from '../../../../config/chains_config.json';
import { ChainConfig } from '../models/configs/ChainConfig';
import { ChainProvider } from '../models/ChainProvider';
import { ChainProviderDetail } from '../models/ChainProviderDetail';
import { AuthType } from '../enums/AuthType';
import { ClassicChainConfig } from '../models/configs/ClassicChainConfig';
import { SolanaChainConfig } from '../models/configs/SolanaChainConfig';

/**
 * Service for controlling configs of chain
 */
@Injectable()
export class ChainConfigService {
  private readonly configs = new Map<number, ChainConfig>();
  private readonly chains: number[] = [];
  private readonly solanaChainId = 7565164;

  constructor() {
    chainConfigs.forEach(config => {
      this.chains.push(config.chainId);
      const isSolana = config.chainId === this.solanaChainId;
      if (isSolana) {
        this.configs.set(config.chainId, {
          chainId: config.chainId,
          name: config.name,
          interval: config.interval,
          isSolana,
        } as SolanaChainConfig);
      } else {
        this.configs.set(config.chainId, {
          chainId: config.chainId,
          name: config.name,
          debridgeAddr: config.debridgeAddr,
          firstStartBlock: config.firstStartBlock,
          providers: this.generateChainProvides(config),
          interval: config.interval,
          blockConfirmation: config.blockConfirmation,
          maxBlockRange: config.maxBlockRange,
          isSolana,
        } as ClassicChainConfig);
      }
    });
  }

  /**
   * Get chain config
   * @param chainId
   */
  get(chainId: number): ChainConfig {
    return this.configs.get(chainId);
  }

  /**
   * Get chains
   */
  getChains() {
    return this.chains;
  }

  /**
   * Get chains
   */
  getConfig() {
    return chainConfigs;
  }

  /**
   * Get solana chain id
   */
  getSolanaChainId() {
    return this.solanaChainId;
  }

  private generateChainProvides(config: any): ChainProvider {
    let providers: ChainProviderDetail[] = [];
    if (config.providers) {
      providers = config.providers.map(provider => {
        return ChainConfigService.transformConfigToProvider(provider);
      });
    } else if (config.provider) {
      providers = [ChainConfigService.transformConfigToProvider(config.provider)];
    }
    return new ChainProvider(providers, config.chainId);
  }

  private static transformConfigToProvider(config: string | Partial<ChainProviderDetail>): ChainProviderDetail {
    if (typeof config === 'string') {
      return {
        provider: config,
        isValid: false,
        isActive: true,
        authType: AuthType.NONE,
      };
    } else {
      config.isValid = false;
      config.isActive = true;
      let authType = AuthType.NONE;
      if (config.user) {
        authType = AuthType.BASIC;
      }
      return {
        isValid: false,
        isActive: true,
        provider: config.provider,
        user: config.user,
        password: config.password,
        authType,
      };
    }
  }
}
