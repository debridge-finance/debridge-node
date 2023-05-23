import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { TransformService } from './TransformService';
import { ConfigService } from '@nestjs/config';
import { SubmissionProcessingService } from './SubmissionProcessingService';
import { solanaChainId } from '../../config/services/ChainConfigService';
import { SolanaEventsReaderService } from '../../../solana-events-reader/services/SolanaEventsReaderService';
import { ProcessNewTransferResultStatusEnum } from '../enums/ProcessNewTransferResultStatusEnum';
import { SolanaGrpcClient, U256Converter } from '@debridge-finance/solana-grpc';

/**
 * Service for reading transaction from solana
 */
@Injectable()
export class SolanaReaderService implements OnModuleInit {
  readonly #logger = new Logger(SolanaReaderService.name);
  readonly #solanaGrpcClient: SolanaGrpcClient;
  #duplex: ReturnType<SolanaGrpcClient['getSendEvents']>;

  #submissionsFromSync: SubmissionEntity[] = [];
  #PAGE_SIZE = 100;
  #heartbeatIntervalInstance: NodeJS.Timeout;

  constructor(
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    private readonly transformService: TransformService,
    private readonly configService: ConfigService,
    private readonly chainProcessingService: SubmissionProcessingService,
    private readonly solanaEventsReaderService: SolanaEventsReaderService,
  ) {
    this.#solanaGrpcClient = solanaEventsReaderService.getClient();
  }

  async syncTransactions() {
    const chain = await this.supportedChainRepository.findOne({
      where: {
        chainId: solanaChainId,
      },
    });
    if (!chain) {
      const message = `Chain ${solanaChainId} is not configured`;
      this.#logger.error(message);
      return;
    }
    const submissions = [...this.#submissionsFromSync].filter(s => s.nonce >= chain.latestNonce);
    submissions.sort((a, b) => a.nonce - b.nonce);
    this.#submissionsFromSync = [];
    const size = Math.ceil(submissions.length / this.#PAGE_SIZE);
    //pagination
    for (let pageNumber = 0; pageNumber < size; pageNumber++) {
      const skip = pageNumber * this.#PAGE_SIZE;
      const end = Math.min((pageNumber + 1) * this.#PAGE_SIZE, submissions.length);
      const submissionsForProcessing = submissions.slice(skip, end);
      const lastSubmission = submissionsForProcessing.at(-1);
      const processingResult = await this.chainProcessingService.process(submissionsForProcessing, solanaChainId, lastSubmission.nonce);
      if (processingResult === ProcessNewTransferResultStatusEnum.ERROR) {
        this.#submissionsFromSync = [];
        this.createSubscription();
        break;
      }
    }
  }

  private async createSubscription() {
    await this.#duplex?.requests?.complete();
    this.#submissionsFromSync = [];
    const chain = await this.supportedChainRepository.findOne({
      where: {
        chainId: solanaChainId,
      },
    });
    if (!chain) {
      const message = `Chain ${solanaChainId} is not configured`;
      this.#logger.error(message);
      return;
    }
    this.#duplex = this.#solanaGrpcClient.getSendEvents(BigInt(chain?.latestNonce || 0), true);

    for await (const response of this.#duplex.responses) {
      if (!(response.sendEventMessage !== undefined && response.sendEventMessage.oneofKind !== undefined)) {
        break;
      }
      switch (response.sendEventMessage.oneofKind) {
        case undefined: {
          continue;
        }
        case 'heartbeat': {
          // @ts-ignore
          this.#logger.verbose(`Heartbeat: ${JSON.stringify(response.sendEventMessage.heartbeat)}`);

          this.heartbeat();
          break;
        }
        case 'event': {
          this.heartbeat();
          // @ts-ignore
          const event = response.sendEventMessage.event;
          const nonce = Number(U256Converter.toBigInt(event.submission?.nonce).toString());
          this.#logger.log(`new event is received nonce: ${nonce}`);

          const submission = this.transformService.generateSubmissionFromSolanaSendEvent(event);
          this.#submissionsFromSync.push(submission);
          break;
        }
      }
    }
  }

  private heartbeat() {
    clearTimeout(this.#heartbeatIntervalInstance);
    const timeout = this.configService.get<number>('DEBRIDGE_EVENTS_CONSISTENCY_CHECK_TIMEOUT_SECS') * 10 * 1000;
    this.#heartbeatIntervalInstance = setTimeout(async () => {
      this.createSubscription();
      this.#logger.error(`Duplex is not active for ${timeout}s`);
    }, timeout);
  }

  onModuleInit() {
    this.createSubscription();
  }
}
