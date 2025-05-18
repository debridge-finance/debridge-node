import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { ChainConfigService } from '../../../chain/config/services/ChainConfigService';
import { buildEvmAutoParams, buildSolanaAutoParams } from '../../../../utils/buildAutoParams';
import { SolanaEventsReaderService } from '../../../solana-events-reader/services/SolanaEventsReaderService';
import { SubmissionTypeEnum } from '../../../../enums/SubmissionTypeEnum';
import { U256Converter } from '@debridge-finance/solana-grpc';

/**
 * Service for filling missing data in submission entities
 *
 * Extracts and populates data from raw events based on chain type:
 * - For Solana chains: extracts execution fee
 * - For EVM chains: extracts both event type and execution fee
 */
@Injectable()
export class SubmissionDataService {

  readonly #submissionsRepository: Repository<SubmissionEntity>;
  readonly #chainConfigService: ChainConfigService;
  readonly #solanaEventsReaderService: SolanaEventsReaderService;

  /**
   * Constructor for SubmissionDataService
   *
   * @param submissionsRepository Repository for submission entities
   * @param chainConfigService Service for chain configuration
   */
  constructor(
    @InjectRepository(SubmissionEntity)
    submissionsRepository: Repository<SubmissionEntity>,
    chainConfigService: ChainConfigService,
    solanaEventsReaderService: SolanaEventsReaderService,
  ) {
    this.#submissionsRepository = submissionsRepository;
    this.#chainConfigService = chainConfigService;
    this.#solanaEventsReaderService = solanaEventsReaderService;
  }

  /**
   * Fills missing data in a submission entity based on its chain type
   *
   * For Solana chains, it extracts execution fee from the raw event
   * For EVM chains, it extracts both the event type and execution fee
   *
   * @param submission The submission entity to update
   * @returns Promise that resolves when the submission is updated and saved
   */
  async fillMissingData(submission: SubmissionEntity): Promise<void> {
    if (submission.type) return;

    const chainDetail = this.#chainConfigService.get(submission.chainFrom);
    if (chainDetail?.isSolana) {
      const bridgeInfo = await this.#solanaEventsReaderService.getClient().getBridgeInfoByBridgeId(Buffer.from(submission.debridgeId.slice(2), 'hex'));
      const nativeChainId = parseInt(U256Converter.toBigInt(bridgeInfo.response.nativeChainId).toString());
      const rawEvent = JSON.parse(submission.rawEvent);
      submission.type = nativeChainId === submission.chainFrom ? SubmissionTypeEnum.Sent : SubmissionTypeEnum.Burn;
      if ('executionFee' in rawEvent) {
        submission.executionFee = rawEvent.executionFee;
      } else {
        submission.executionFee = buildSolanaAutoParams(rawEvent).executionFee;
      }
    } else {
      const rawEvent = JSON.parse(submission.rawEvent);
      const { event } = rawEvent;
      submission.type = event;
      submission.executionFee = buildEvmAutoParams(rawEvent).executionFee;
    }

    await this.#submissionsRepository.save(submission);
  }
}
