import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../entities/SubmissionEntity';
import missedEvents from '../config/datafixes/missed_events.json';
import { BundlrStatusEnum } from '../enums/BundlrStatusEnum';
import { SubmisionAssetsStatusEnum } from '../enums/SubmisionAssetsStatusEnum';
import { UploadStatusEnum } from '../enums/UploadStatusEnum';
import { SubmisionStatusEnum } from '../enums/SubmisionStatusEnum';

@Injectable()
export class MissedEventsService implements OnModuleInit {
  readonly #logger = new Logger(MissedEventsService.name);
  readonly #submissionRepository: Repository<SubmissionEntity>;

  constructor(
    @InjectRepository(SubmissionEntity)
    submissionRepository: Repository<SubmissionEntity>,
  ) {
    this.#submissionRepository = submissionRepository;
  }

  async onModuleInit() {
    this.#logger.log('MissedEventsService started');
    await this.#processMissedEvents();
  }

  #processMissedEvents = async () => {
    try {
      this.#logger.log(`Found ${missedEvents.length} missed events to process`);

      for (const event of missedEvents) {
        await this.#processEvent(event);
      }

      this.#logger.log('Finished processing missed events');
    } catch (error) {
      this.#logger.error(`Error processing missed events: ${error.message}`, error.stack);
    }
  };

  async #processEvent(event: any) {
    try {
      // Check if submission already exists
      if (!event.submissionId) {
        this.#logger.log(`Submission ${event.submissionId} doesn't have submission id, skipping`);
        return;
      }
      const existingSubmission = await this.#submissionRepository.findOne({
        where: {
          submissionId: event.submissionId,
        },
      });

      if (existingSubmission) {
        this.#logger.log(`Submission ${event.submissionId} already exists in database, skipping`);
        return;
      }

      this.#logger.log(`Adding missed submission ${event.submissionId} to database`);

      // Create new submission entity
      const submission = {
        submissionId: event.submissionId,
        txHash: event.txHash,
        chainFrom: event.chainFrom,
        chainTo: event.chainTo,
        debridgeId: event.debridgeId,
        receiverAddr: event.receiverAddr,
        amount: event.amount,
        rawEvent: event.rawEvent,
        status: SubmisionStatusEnum.NEW,
        ipfsStatus: UploadStatusEnum.NEW,
        apiStatus: UploadStatusEnum.NEW,
        bundlrStatus: BundlrStatusEnum.NEW,
        assetsStatus: SubmisionAssetsStatusEnum.NEW,
        nonce: event.nonce,
        blockNumber: event.blockNumber,
      } as SubmissionEntity;

      // Save to database
      await this.#submissionRepository.save(submission);
      this.#logger.log(`Successfully added submission ${event.submissionId} to database`);
    } catch (error) {
      this.#logger.error(`Error processing event with ${event.submissionId}: ${error.message}`, error.stack);
    }
  }
}
