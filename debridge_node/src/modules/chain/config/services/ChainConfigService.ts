import { Injectable } from '@nestjs/common';
import chainConfigs from '../../../../config/chains_config.json';
import { ChainConfig } from '../models/configs/ChainConfig';
import { ChainProvider } from '../models/ChainProvider';
import { ChainProviderDetail } from '../models/ChainProviderDetail';
import { AuthType } from '../enums/AuthType';
import { EvmChainConfig } from '../models/configs/EvmChainConfig';
import { SolanaChainConfig } from '../models/configs/SolanaChainConfig';

export const solanaChainId = 7565164;
const defaultMaxAttemptsSubmissionIdCalculation = 10;

/**
 * Service for controlling configs of chain
 */
@Injectable()
export class ChainConfigService {
  private readonly configs = new Map<number, ChainConfig>();
  private readonly chains: number[] = [];

  constructor() {
    chainConfigs.forEach(config => {
      this.chains.push(config.chainId);
      const isSolana = config.chainId === solanaChainId;
      if (isSolana) {
        this.configs.set(config.chainId, {
          chainId: config.chainId,
          name: config.name,
          interval: config.interval,
          firstStartNonce: 0,
          isSolana,
          maxAttemptsSubmissionIdCalculation: config.maxAttemptsSubmissionIdCalculation || defaultMaxAttemptsSubmissionIdCalculation,
        } as SolanaChainConfig);
      } else {
        if (config.firstStartBlock === 0) {
          throw new Error(`firstStartBlock cannot be empty for chain ${config.chainId}`);
        }
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
          maxAttemptsSubmissionIdCalculation: config.maxAttemptsSubmissionIdCalculation || defaultMaxAttemptsSubmissionIdCalculation,
        } as EvmChainConfig);
      }
    });
  }

  /**
   * Get chain config
   * @param chainId
   */
  get(chainId: number | string): ChainConfig {
    if (typeof chainId === 'string') {
      return this.configs.get(parseInt(chainId));
    }
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
