import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ChainScanningService } from '../../../chain/scanning/services/ChainScanningService';
import { DebrdigeApiService } from '../../../external/debridge_api/services/DebrdigeApiService';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { BalanceValidationStatusEnum } from '../../../../enums/BalanceValidationStatusEnum';
import { BalanceSheetEntity } from '../../../../entities/BalanceSheetEntity';

@Injectable()
export class BalanceValidationStatusService {
  readonly #logger = new Logger(BalanceValidationStatusService.name);
  readonly #entityManager: EntityManager;
  readonly #debrdigeApiService: DebrdigeApiService;
  readonly #chainScanningService: ChainScanningService;

  constructor(
    @InjectEntityManager()
    entityManager: EntityManager,
    debrdigeApiService: DebrdigeApiService,
    chainScanningService: ChainScanningService,
  ) {
    this.#entityManager = entityManager;
    this.#debrdigeApiService = debrdigeApiService;
    this.#chainScanningService = chainScanningService;
  }

  /**
   * Completes the balance validation by updating the submission status and saving balance sheets
   * within a transaction
   *
   * @param submission The submission entity to update
   * @param senderBalance The sender's balance sheet entity
   * @param receiverBalance The receiver's balance sheet entity
   * @returns Promise that resolves when the transaction is complete
   */
  async complete(submission: SubmissionEntity, senderBalance: BalanceSheetEntity, receiverBalance: BalanceSheetEntity): Promise<void> {
    await this.#entityManager.transaction(async entityManager => {
      submission.balanceValidationStatus = BalanceValidationStatusEnum.COMPLETED;
      await entityManager.save(SubmissionEntity, submission);
      await entityManager.save(BalanceSheetEntity, [senderBalance, receiverBalance]);
    });
    this.#logger.log(`Balance validation completed for submission ${submission.submissionId}`);
  }

  /**
   * Marks the balance validation as failed by updating the submission status
   * within a transaction
   *
   * @param submission The submission entity to update
   * @param comment Optional comment to log
   * @returns Promise that resolves when the transaction is complete
   */
  async fail(submission: SubmissionEntity, comment: string): Promise<void> {
    await this.#entityManager.transaction(async entityManager => {
      submission.balanceValidationStatus = BalanceValidationStatusEnum.ERROR;
      await entityManager.save(SubmissionEntity, submission);
    });
    const message = `Balance validation failed for submission ${submission.submissionId}: ${comment}`;
    await this.#debrdigeApiService.notifyError(message);
    this.#chainScanningService.pause(submission.chainFrom);

    this.#logger.error(message);
    throw new Error(message);
  }
}
