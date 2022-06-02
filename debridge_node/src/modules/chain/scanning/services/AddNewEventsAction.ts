import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { abi as deBridgeGateAbi } from '../../../../assets/DeBridgeGate.json';
import { Web3Service } from '../../../web3/services/Web3Service';
import { ChainScanningService } from './ChainScanningService';
import { SolanaReaderService } from './SolanaReaderService';
import { ChainConfigService } from '../../config/services/ChainConfigService';
import { ClassicChainConfig } from '../../config/models/configs/ClassicChainConfig';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SubmissionProcessingService } from './SubmissionProcessingService';
import { TransformService } from './TransformService';
import { MonitoringSentEventEntity } from '../../../../entities/MonitoringSentEventEntity';

@Injectable()
export class AddNewEventsAction {
  private readonly logger = new Logger(AddNewEventsAction.name);
  private readonly locker = new Map();

  constructor(
    @Inject(forwardRef(() => ChainScanningService))
    private readonly chainScanningService: ChainScanningService,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectRepository(MonitoringSentEventEntity)
    private readonly monitoringSentEventRepository: Repository<MonitoringSentEventEntity>,
    private readonly chainConfigService: ChainConfigService,
    private readonly web3Service: Web3Service,
    private readonly solanaReaderService: SolanaReaderService,
    private readonly chainProcessingService: SubmissionProcessingService,
    private readonly transformService: TransformService,
  ) {}

  async action(chainId: number) {
    if (this.locker.get(chainId)) {
      this.logger.warn(`Is working now. chainId: ${chainId}`);
      return;
    }
    try {
      this.locker.set(chainId, true);
      this.logger.log(`Is locked chainId: ${chainId}`);
      const chain = this.chainConfigService.get(chainId);
      if (chain.isSolana) {
        await this.solanaReaderService.syncTransactions(chainId);
      } else {
        await this.process(chainId);
      }
    } catch (e) {
      this.logger.error(`Error while scanning chainId: ${chainId}; error: ${e.message} ${JSON.stringify(e)}`);
    } finally {
      this.locker.set(chainId, false);
      this.logger.log(`Is unlocked chainId: ${chainId}`);
    }
  }

  /**
   * Process events by period
   * @param {string} chainId
   * @param {number} from
   * @param {number} to
   */
  async process(chainId: number, from: number = undefined, to: number = undefined) {
    const logger = new Logger(`${AddNewEventsAction.name} chainId ${chainId}`);
    logger.verbose(`process checkNewEvents - chainId: ${chainId}; from: ${from}; to: ${to}`);
    const supportedChain = await this.supportedChainRepository.findOne({
      where: {
        chainId,
      },
    });
    const chainDetail = this.chainConfigService.get(chainId) as ClassicChainConfig;

    const web3 = await this.web3Service.web3HttpProvider(chainDetail.providers);

    const contract = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);
    // @ts-ignore
    web3.eth.setProvider = contract.setProvider;

    const toBlock = to || (await web3.eth.getBlockNumber()) - chainDetail.blockConfirmation;
    let fromBlock = from || (supportedChain.latestBlock > 0 ? supportedChain.latestBlock : toBlock - 1);

    logger.debug(`Getting events from ${fromBlock} to ${toBlock} ${supportedChain.network}`);

    for (fromBlock; fromBlock < toBlock; fromBlock += chainDetail.maxBlockRange) {
      const lastBlockOfPage = Math.min(fromBlock + chainDetail.maxBlockRange, toBlock);
      logger.log(`supportedChain.network: ${supportedChain.network} ${fromBlock}-${lastBlockOfPage}`);
      if (supportedChain.latestBlock === lastBlockOfPage) {
        logger.warn(`latestBlock in db ${supportedChain.latestBlock} == lastBlockOfPage ${lastBlockOfPage}`);
        continue;
      }
      const monitoringSentEvents = await this.getEvents(contract, 'MonitoringSendEvent', fromBlock, lastBlockOfPage);
      const sentEvents = await this.getEvents(contract, 'Sent', fromBlock, lastBlockOfPage);
      logger.log(`sentEvents: ${JSON.stringify(sentEvents)}`);
      if (!sentEvents || sentEvents.length === 0) {
        logger.verbose(`Not found any events for ${chainId} ${fromBlock} - ${lastBlockOfPage}`);
        await this.supportedChainRepository.update(chainId, {
          latestBlock: lastBlockOfPage,
          validationTimestamp: await this.transformService.getBlockTimestamp(chainId, lastBlockOfPage),
        });
        continue;
      }
      const submissions = sentEvents.map(sendEvent => {
        const submissionId = sendEvent.returnValues.submissionId;
        try {
          if (sendEvent.returnValues.chainIdFrom === undefined || sendEvent.returnValues.chainIdFrom === null) {
            sendEvent.returnValues.chainIdFrom = chainId;
          }
          return this.transformService.generateSubmissionFromSentEvent(sendEvent);
        } catch (e) {
          this.logger.error(`Error in transforming sent event to submission ${submissionId}: ${e.message}`);
        }
      });
      const monitors = monitoringSentEvents.map(monitoringSentEvent => {
        return {
          submissionId: monitoringSentEvent.returnValues.submissionId,
          nonce: monitoringSentEvent.returnValues.nonce,
          blockNumber: monitoringSentEvent.blockNumber,
          lockedOrMintedAmount: monitoringSentEvent.returnValues.lockedOrMintedAmount,
          totalSupply: monitoringSentEvent.returnValues.totalSupply,
          chainId: chainId,
        } as MonitoringSentEventEntity;
      });
      await this.chainProcessingService.process(submissions, monitors, chainId, lastBlockOfPage, web3);
    }
  }

  async getEvents(contract, eventType: 'Sent' | 'MonitoringSendEvent', fromBlock: number, toBlock) {
    if (fromBlock >= toBlock) return;

    /* get events */
    return await contract.getPastEvents(eventType, { fromBlock, toBlock });
  }
}
