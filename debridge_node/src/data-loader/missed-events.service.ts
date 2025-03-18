import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../entities/SubmissionEntity';
import missedEvents from '../../../config/datafixes/missedEvents.json';

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

  #processEvent = async (event: any) => {
    try {
      const { submissionId } = event;

      // Check if submission already exists
      const existingSubmission = await this.#submissionRepository.findOne({ where: { submissionId } });

      if (existingSubmission) {
        this.#logger.log(`Submission ${submissionId} already exists in database, skipping`);
        return;
      }

      this.#logger.log(`Adding missed submission ${submissionId} to database`);

      // Create new submission entity
      const submission = new SubmissionEntity();
      submission.submissionId = event.submissionId;
      submission.txHash = event.txHash;
      submission.chainFrom = event.chainFrom;
      submission.chainTo = event.chainTo;
      submission.debridgeId = event.debridgeId;
      submission.receiverAddr = event.receiverAddr;
      submission.amount = event.amount.toString();
      submission.rawEvent = event.rawEvent;
      submission.signature = event.signature || null;
      submission.bundlrTx = event.bundlrTx || null;
      submission.ipfsLogHash = event.ipfsLogHash || null;
      submission.ipfsKeyHash = event.ipfsKeyHash || null;
      submission.externalId = event.externalId || null;
      submission.status = event.status;
      submission.ipfsStatus = event.ipfsStatus;
      submission.apiStatus = event.apiStatus;
      submission.bundlrStatus = event.bundlrStatus;
      submission.assetsStatus = event.assetsStatus;
      submission.nonce = event.nonce || null;
      submission.blockNumber = event.blockNumber || null;
      submission.blockTime = event.blockTime || null;
      submission.decimalDenominator = event.decimalDenominator || 0;

      // Save to database
      await this.#submissionRepository.save(submission);
      this.#logger.log(`Successfully added submission ${submissionId} to database`);
    } catch (error) {
      this.#logger.error(`Error processing event with submissionId ${event.submissionId}: ${error.message}`, error.stack);
    }
  };
}
