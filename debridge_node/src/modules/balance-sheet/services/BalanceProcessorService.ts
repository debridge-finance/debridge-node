import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SubmissionEntity } from '../../../entities/SubmissionEntity';
import { Not } from 'typeorm';
import { BalanceValidationStatusEnum } from 'src/enums/BalanceValidationStatusEnum';
import { BalanceValidationService } from './BalanceValidationService';

@Injectable()
export class BalanceProcessorService {
  readonly #logger = new Logger(BalanceProcessorService.name);
  readonly #submissionsRepository: Repository<SubmissionEntity>;
  readonly #balanceValidationService: BalanceValidationService;

  constructor(
    @InjectRepository(SubmissionEntity)
    submissionsRepository: Repository<SubmissionEntity>,
    balanceValidationService: BalanceValidationService,
  ) {
    this.#submissionsRepository = submissionsRepository;
    this.#balanceValidationService = balanceValidationService;
  }

  /**
   * Processes submissions in batches, fills missing data and calculates balance
   *
   * Uses the async iterator to process submissions in batches. For each submission, it fills missing data and calculates the balance.
   */
  async processSubmissions(): Promise<void> {
    const debridgeIds = await this.#submissionsRepository.createQueryBuilder('submission')
      .select('DISTINCT submission.debridgeId')
      .where('submission.balanceValidationStatus NOT IN (:...statuses)', {
        statuses: [BalanceValidationStatusEnum.COMPLETED, BalanceValidationStatusEnum.ERROR],
      })
      .getMany()
      .then(submissions => submissions.map(s => s.debridgeId));

    for (const debridgeId of debridgeIds) {
      for await (const submissions of await this.#submissionsIterator(debridgeId)) {
        this.#logger.log(`Processing ${submissions.length} submissions`);
        for (const submission of submissions) {
          try {
            await this.#balanceValidationService.processSubmission(submission);
          } catch (error) {
            this.#logger.error(`Processing submission ${submission.submissionId} failed`, error);
            if (await this.isSubmissionSkipped(submission.submissionId)) {
              this.#logger.log(`Submission ${submission.submissionId} is skipped`);
              continue;
            }
            throw error;
          }
        }
      }
    }
  }

  async isSubmissionSkipped(submissionId: string): Promise<boolean> {
    const submission = await this.#submissionsRepository.findOne({ where: { submissionId } });
    return submission?.balanceValidationStatus === BalanceValidationStatusEnum.ON_HOLD;
  }

  /**
   * Create an async iterator for submissions to process them in batches
   * @param batchSize The number of submissions to process in each batch
   */
  async *#submissionsIterator(debridgeId: string, batchSize: number = 100): AsyncGenerator<SubmissionEntity[]> {
    let page = 1;
    let hasMoreData = true;

    while (hasMoreData) {
      const submissions = await this.#submissionsRepository.find({
        where: {
          balanceValidationStatus: Not(In([BalanceValidationStatusEnum.COMPLETED, BalanceValidationStatusEnum.ERROR])),
        },
        order: {
          nonce: 'ASC',
          createdAt: 'ASC',
        },
        skip: (page - 1) * batchSize,
        take: batchSize,
      });

      if (submissions.length > 0) {
        yield submissions;
        page++;
      } else {
        hasMoreData = false;
      }
    }
  }
}
