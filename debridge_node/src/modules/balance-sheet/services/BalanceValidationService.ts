import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../../entities/SubmissionEntity';
import { ValidateSynchronizationService } from './utils/ValidateSynchronizationService';
import { DebridgeValidationService } from './utils/DebridgeValidationService';
import { BalanceValidationStatusService } from './utils/BalanceValidationStatusService';
import { SubmissionDataService } from './utils/SubmissionDataService';
import { BalanceSheetInitializatorService } from './utils/BalanceSheetInitializatorService';
import { SubmissionTypeEnum } from '../../../enums/SubmissionTypeEnum';
import { MonitoringSendEventEntity } from '../../../entities/MonitoringSendEventEntity';
import { BalanceSheetEntity } from '../../../entities/BalanceSheetEntity';

@Injectable()
export class BalanceValidationService {
  readonly #logger = new Logger(BalanceValidationService.name);
  readonly #balanceSheetInitializatorService: BalanceSheetInitializatorService;
  readonly #debridgeValidationService: DebridgeValidationService;
  readonly #validateSynchronizationService: ValidateSynchronizationService;
  readonly #monitoringSendEventRepository: Repository<MonitoringSendEventEntity>;
  readonly #balanceValidationStatusService: BalanceValidationStatusService;
  readonly #submissionDataService: SubmissionDataService;

  constructor(
    balanceSheetInitializatorService: BalanceSheetInitializatorService,
    @InjectRepository(MonitoringSendEventEntity)
    monitoringSendEventRepository: Repository<MonitoringSendEventEntity>,
    debridgeValidationService: DebridgeValidationService,
    validateSynchronizationService: ValidateSynchronizationService,
    balanceValidationStatusService: BalanceValidationStatusService,
    submissionDataService: SubmissionDataService,
  ) {
    this.#balanceSheetInitializatorService = balanceSheetInitializatorService;
    this.#monitoringSendEventRepository = monitoringSendEventRepository;
    this.#debridgeValidationService = debridgeValidationService;
    this.#validateSynchronizationService = validateSynchronizationService;
    this.#balanceValidationStatusService = balanceValidationStatusService;
    this.#submissionDataService = submissionDataService;
  }

  /**
   * Processes submissions in batches, fills missing data and calculates balance
   *
   * Uses the async iterator to process submissions in batches. For each submission, it fills missing data and calculates the balance.
   */
  async processSubmission(submission: SubmissionEntity): Promise<void> {
    this.#logger.log(`Processing submission ${submission.submissionId} started`);
    await this.#submissionDataService.fillMissingData(submission);
    await this.#processBalance(submission);

    this.#logger.log(`Processing submission ${submission.submissionId} finished`);
  }


  /**
   * Calculates the balance of sender and receiver based on the submission type
   *
   * For Sent submissions, it adds the amount and execution fee to both the sender and receiver balances
   * For Burn submissions, it subtracts the amount and execution fee from both the sender and receiver balances
   * unless the submission is a return to native chain submission, in which case it adds the amount and execution fee to the sender balance
   * and subtracts it from the receiver balance.
   *
   * @param submission The submission entity to process
   */
  async #processBalance(submission: SubmissionEntity) {
    const [senderBalance, receiverBalance] = await this.#balanceSheetInitializatorService.getOrCreateBalanceSheetEntities(submission);
    const D = BigInt(submission.amount) + BigInt(submission.executionFee);
    const monitorSendEvent = await this.#monitoringSendEventRepository.findOneBy({ submissionId: submission.submissionId });
    switch (submission.type) {
      case SubmissionTypeEnum.Sent:
        senderBalance.amount = senderBalance.amount + D;
        receiverBalance.amount = receiverBalance.amount + D;
        await this.#compareBalance(senderBalance, receiverBalance, submission, monitorSendEvent);
        break;
      case SubmissionTypeEnum.Burn:
        const isReturnToNativeChain = await this.#debridgeValidationService.isReturnToNativeChain(submission);
        if (isReturnToNativeChain) {
          senderBalance.amount = senderBalance.amount - D;
          receiverBalance.amount = receiverBalance.amount - D;
        } else {
          senderBalance.amount = senderBalance.amount + D;
          receiverBalance.amount = receiverBalance.amount - D;
        }
        if (senderBalance.amount < 0) {
          await this.#validateSynchronizationService.validate(submission, 'Sender balance is less than 0');
        }
        if (receiverBalance.amount < 0) {
          await this.#validateSynchronizationService.validate(submission, 'Receiver balance is less than 0');
        }
        await this.#compareBurnEventBalance(senderBalance, receiverBalance, submission, monitorSendEvent);
        break;
      default:
        break;
    }
  }

  async #compareBurnEventBalance(
    senderBalance: BalanceSheetEntity,
    receiverBalance: BalanceSheetEntity,
    submission: SubmissionEntity,
    monitorSendEvent: MonitoringSendEventEntity,
  ) {
    if (monitorSendEvent.lockedOrMintedAmount === senderBalance.amount) {
      await this.#compareBalance(senderBalance, receiverBalance, submission, monitorSendEvent);
    } else {
      await this.#validateSynchronizationService.validate(submission, 'Locked or minted amount is not equal to sender balance');
    }
  }

  /**
   * Compares calculated balance with monitoring event data
   *
   * Validates that the calculated balance matches the expected values from monitoring events
   *
   * If the submission is a DeAsset transfer, the balance validation is skipped
   * If the submission is a return to native chain, the balance validation is only completed if the locked amount from the monitoring event
   * is less than or equal to the sender's balance
   * Otherwise, the balance validation is only completed if the locked amount from the monitoring event
   * is equal to the sender's balance and the total supply from the monitoring event is equal to the receiver's balance
   *
   * @param senderBalance The balance sheet entity for the sender chain
   * @param receiverBalance The balance sheet entity for the receiver chain
   * @param submission The submission entity being processed
   * @param monitorSendEvent The monitoring event containing expected balance values
   * @returns Promise that resolves when the comparison is complete
   */
  async #compareBalance(
    senderBalance: BalanceSheetEntity,
    receiverBalance: BalanceSheetEntity,
    submission: SubmissionEntity,
    monitorSendEvent: MonitoringSendEventEntity,
  ): Promise<void> {
    const isDeAssetTransfer = await this.#debridgeValidationService.isDeAssetTransfer(submission);
    if (!isDeAssetTransfer) {
      await this.#balanceValidationStatusService.complete(submission, senderBalance, receiverBalance);
    }
    const isReturnToNativeChain = await this.#debridgeValidationService.isReturnToNativeChain(submission);
    if (isReturnToNativeChain) {
      if (monitorSendEvent.lockedOrMintedAmount < senderBalance.amount) {
        await this.#validateSynchronizationService.validate(submission, 'Locked or minted amount is less than sender balance');
      } else {
        await this.#balanceValidationStatusService.complete(submission, senderBalance, receiverBalance);
      }
    } else {
      if (monitorSendEvent.lockedOrMintedAmount > senderBalance.amount) {
        await this.#validateSynchronizationService.validate(submission, 'Locked or minted amount is greater than sender balance');
      } else {
        if (monitorSendEvent.lockedOrMintedAmount === monitorSendEvent.totalSupply) {
          await this.#balanceValidationStatusService.complete(submission, senderBalance, receiverBalance);
        } else {
          await this.#balanceValidationStatusService.fail(submission, `monitorSendEvent.lockedOrMintedAmount !== monitorSendEvent.totalSupply`);
        }
      }
    }
  }
}
