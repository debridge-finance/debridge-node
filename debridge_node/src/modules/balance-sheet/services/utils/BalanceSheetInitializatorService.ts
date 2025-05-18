import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceSheetEntity } from '../../../../entities/BalanceSheetEntity';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';

/**
 * Service for managing balance sheet entities
 * 
 * Handles the creation and retrieval of balance sheet entities for different chains
 */
@Injectable()
export class BalanceSheetInitializatorService {
  readonly #logger = new Logger(BalanceSheetInitializatorService.name);
  readonly #balanceSheetRepository: Repository<BalanceSheetEntity>;

  constructor(
    @InjectRepository(BalanceSheetEntity)
    balanceSheetRepository: Repository<BalanceSheetEntity>,
  ) {
    this.#balanceSheetRepository = balanceSheetRepository;
  }

  /**
   * Gets or creates balance sheet entities for source and destination chains
   * @param submission The submission entity containing debridgeId, chainFrom, and chainTo
   * @returns Promise with an array of two BalanceSheetEntity objects [sourceChainEntity, destChainEntity]
   */
  async getOrCreateBalanceSheetEntities(
    submission: SubmissionEntity,
  ): Promise<[BalanceSheetEntity, BalanceSheetEntity]> {
    // Get or create entities for both chains
    const sourceChainEntity = await this.#getOrCreateBalanceSheetEntity(submission.debridgeId, submission.chainFrom);
    const destChainEntity = await this.#getOrCreateBalanceSheetEntity(submission.debridgeId, submission.chainTo);

    return [sourceChainEntity, destChainEntity];
  }

  /**
   * Gets or creates a single balance sheet entity for the given debridgeId and chainId
   * @param debridgeId The debridge ID
   * @param chainId The chain ID
   * @returns Promise with the found or created BalanceSheetEntity
   */
  async #getOrCreateBalanceSheetEntity(
    debridgeId: string,
    chainId: number,
  ): Promise<BalanceSheetEntity> {
    // Check if entity exists
    let entity = await this.#balanceSheetRepository.findOne({
      where: { debridgeId, chainId },
    });

    // Create entity if it doesn't exist
    if (!entity) {
      entity = new BalanceSheetEntity();
      entity.debridgeId = debridgeId;
      entity.chainId = chainId;
      entity.amount = 0n;
      this.#logger.log(`Created new balance sheet entity for debridgeId ${debridgeId} on chain ${chainId}`);
    }

    return entity;
  }
}
