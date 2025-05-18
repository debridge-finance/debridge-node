import { Injectable } from '@nestjs/common';
import { SubmissionEntity } from 'src/entities/SubmissionEntity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedChainEntity } from 'src/entities/SupportedChainEntity';
import { BalanceValidationStatusService } from './BalanceValidationStatusService';
import { BalanceSheetEntity } from 'src/entities/BalanceSheetEntity';
import { BalanceValidationStatusEnum } from 'src/enums/BalanceValidationStatusEnum';

@Injectable()
export class ValidateSynchronizationService {
  readonly #supportedChainRepository: Repository<SupportedChainEntity>;
  readonly #submissionsRepository: Repository<SubmissionEntity>;
  readonly #balanceValidationStatusService: BalanceValidationStatusService;

  constructor(
    @InjectRepository(SupportedChainEntity)
    supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    submissionsRepository: Repository<SubmissionEntity>,
    balanceValidationStatusService: BalanceValidationStatusService,
  ) {
    this.#supportedChainRepository = supportedChainRepository;
    this.#submissionsRepository = submissionsRepository;
    this.#balanceValidationStatusService = balanceValidationStatusService;
  }

  async validate(submission: SubmissionEntity, comment: string): Promise<void> {
    const supportedChain = await this.#supportedChainRepository.findOne({
      where: {
        chainId: submission.chainTo,
      },
    });

    const result = true;
    if (result) {
      await this.#balanceValidationStatusService.fail(submission, comment);
    } else {
      submission.balanceValidationStatus = BalanceValidationStatusEnum.ON_HOLD;
      await this.#submissionsRepository.save(submission);
      throw new Error(`Submission ${submission.submissionId} on hold`);
    }
  }
}
