import { Injectable, Logger } from '@nestjs/common';
import { abi as deBridgeGateAbi } from '../../../../assets/DeBridgeGate.json';
import { Web3Service } from '../../../web3/services/Web3Service';
import { SolanaReaderService } from './SolanaReaderService';
import { ChainConfigService } from '../../config/services/ChainConfigService';
import { EvmChainConfig } from '../../config/models/configs/EvmChainConfig';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SubmissionProcessingService } from './SubmissionProcessingService';
import { TransformService } from './TransformService';
import { RpcValidationStatusEnum } from '../../../../enums/RpcValidationStatusEnum';

@Injectable()
export class AddNewEventsAction {
  private readonly logger = new Logger(AddNewEventsAction.name);
  private readonly locker = new Map();

  constructor(
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
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
    const chainDetail = this.chainConfigService.get(chainId) as EvmChainConfig;

    const web3 = await this.web3Service.web3HttpProvider(chainDetail.providers);
    const registerInstance = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);
    // @ts-ignore
    web3.eth.setProvider = registerInstance.setProvider;

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
      const sentEvents = await this.getEvents(registerInstance, fromBlock, lastBlockOfPage);
      logger.log(`sentEvents: ${JSON.stringify(sentEvents)}`);
      if (!sentEvents || sentEvents.length === 0) {
        logger.verbose(`Not found any events for ${chainId} ${fromBlock} - ${lastBlockOfPage}`);
        await this.supportedChainRepository.update(chainId, {
          latestBlock: lastBlockOfPage,
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

      if (chainDetail.rpcConfirmation) {
        //validate that n rpc return the same submissions
        try {
          // if providers in config less amount that needed confirmation we dont need to check
          if (chainDetail.providers.size() >= chainDetail.rpcConfirmation) {
            const providersForConfirmation = chainDetail.providers.getAllProviders();
            const rpcConfirmationSubmissions = await Promise.all(
              providersForConfirmation.map(async provider => {
                const web3ForConfirmation = await this.web3Service.createWeb3HttpProviderByProvider(provider, chainDetail.providers);
                const registerInstanceConfirmation = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);
                // @ts-ignore
                web3ForConfirmation.eth.setProvider = registerInstanceConfirmation.setProvider;

                let events = [];
                try {
                  events = await this.getEvents(registerInstanceConfirmation, fromBlock, lastBlockOfPage);
                } catch (e) {
                  this.logger.error(`Error in getting events: ${e.message}`);
                }
                return {
                  provider,
                  submissionIds: events.map(i => i.returnValues.submissionId),
                };
              }),
            );
            for (const submission of submissions) {
              let confirmations = 0;
              for (const rpcConfirmationSubmission of rpcConfirmationSubmissions) {
                if (rpcConfirmationSubmission.submissionIds.includes(submission.submissionId)) {
                  confirmations++;
                  this.logger.log(`${rpcConfirmationSubmission.provider} returns correct ${submission.submissionId}`);
                } else {
                  this.logger.log(`${rpcConfirmationSubmission.provider} returns incorrect ${submission.submissionId}`);
                  if (chainDetail.providers.getRequireConfirmation(rpcConfirmationSubmission.provider)) {
                    confirmations = 0;
                    break;
                  }
                }
              }

              submission.rpcConfirmation =
                confirmations >= chainDetail.rpcConfirmation ? RpcValidationStatusEnum.VALIDATED : RpcValidationStatusEnum.NEW;
            }
          } else {
            this.logger.warn(`Require confirmation ${chainDetail.rpcConfirmation} but setted ${chainDetail.providers.size()} rpc`);
          }
        } catch (e) {
          this.logger.error(`Error in rpc confirmations: ${e.message}`);
        }
      }

      await this.chainProcessingService.process(submissions, chainId, lastBlockOfPage, web3);
    }
  }

  async getEvents(registerInstance, fromBlock: number, toBlock) {
    if (fromBlock >= toBlock) return;

    /* get events */
    return await registerInstance.getPastEvents('Sent', { fromBlock, toBlock });
  }
}
