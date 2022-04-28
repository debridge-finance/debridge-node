import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Web3Custom } from '../../../web3/services/Web3Service';
import { DebrdigeApiService } from '../../../external/debridge_api/services/DebrdigeApiService';
import { NonceValidationEnum } from '../enums/NonceValidationEnum';
import { ProcessNewTransferResult } from '../entities/ProcessNewTransferResult';
import { ChainConfig } from '../../config/models/configs/ChainConfig';
import { ClassicChainConfig } from '../../config/models/configs/ClassicChainConfig';
import { ChainScanningService } from './ChainScanningService';

@Injectable()
export class NonceControllingService implements OnModuleInit {
  private readonly maxNonceChains = new Map<number, number>();
  private readonly logger = new Logger(NonceControllingService.name);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly debridgeApiService: DebrdigeApiService,
    private readonly chainScanningService: ChainScanningService,
  ) {}

  async onModuleInit() {
    const chains = await this.entityManager.query(`
    SELECT "chainFrom", MAX(nonce)
      FROM public.submissions as submissions
      JOIN public.supported_chains as chains
      ON (chains."chainId" = submissions."chainFrom")
      WHERE submissions."blockNumber" <= chains."latestBlock"  GROUP BY "chainFrom"
        `);
    for (const { chainFrom, max } of chains) {
      this.maxNonceChains.set(chainFrom, max);
      this.logger.verbose(`Max nonce in chain ${chainFrom} is ${max}`);
    }
    //todo check script for solana
  }

  getMaxNonce(chainId: number): number {
    return this.maxNonceChains.get(chainId);
  }

  setMaxNonce(chainId: number, nonce: number) {
    this.maxNonceChains.set(chainId, nonce);
  }

  async processValidationNonceError(transferResult: ProcessNewTransferResult, chainId: number, web3: Web3Custom, chain: ChainConfig) {
    if (transferResult.nonceValidationStatus === NonceValidationEnum.MISSED_NONCE) {
      await this.debridgeApiService.notifyError(
        `incorrect nonce error (missed_nonce): nonce: ${transferResult.nonce}; submissionId: ${transferResult.submissionId}`,
      );
      if (!chain.isSolana) {
        (chain as ClassicChainConfig).providers.setProviderStatus(web3.chainProvider, false);
      }
      return NonceValidationEnum.MISSED_NONCE;
    } else if (transferResult.nonceValidationStatus === NonceValidationEnum.DUPLICATED_NONCE) {
      await this.debridgeApiService.notifyError(
        `incorrect nonce error (duplicated_nonce): nonce: ${transferResult.nonce}; submissionId: ${transferResult.submissionId}`,
      );
      this.chainScanningService.pause(chainId);
      return NonceValidationEnum.DUPLICATED_NONCE;
    }
  }

  /**
   * Validate nonce
   * @param nonceDb
   * @param nonce
   * @param nonceExists
   */
  validateNonce(nonceDb: number, nonce: number, nonceExists: boolean): NonceValidationEnum {
    if (nonceExists) {
      return NonceValidationEnum.DUPLICATED_NONCE;
    } else if ((nonceDb === undefined && nonce !== 0) || (nonceDb != undefined && nonce !== nonceDb + 1)) {
      // (nonceDb === undefined && nonce !== 0) may occur in empty db
      return NonceValidationEnum.MISSED_NONCE;
    }
    return NonceValidationEnum.SUCCESS;
  } // check this method (nonce = nonceDb +1 ok)
}
