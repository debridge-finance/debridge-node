import { Injectable, Logger } from '@nestjs/common';
import { abi as deBridgeGateAbi } from '../../../../assets/DeBridgeGate.json';
import { Web3Custom, Web3Service } from '../../../web3/services/Web3Service';
import { SolanaReaderService } from './SolanaReaderService';
import { ChainConfigService } from '../../config/services/ChainConfigService';
import { EvmChainConfig } from '../../config/models/configs/EvmChainConfig';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../../../entities/SupportedChainEntity';
import { Repository } from 'typeorm';
import { SubmissionProcessingService } from './SubmissionProcessingService';
import { TransformService } from './TransformService';
import { ProcessNewTransferResultStatusEnum } from '../enums/ProcessNewTransferResultStatusEnum';
import Contract from 'web3-eth-contract';
import { SubmissionEntity } from 'src/entities/SubmissionEntity';

@Injectable()
export class AddNewEventsAction {
  private readonly logger = new Logger(AddNewEventsAction.name);
  private readonly locker = new Map();

  constructor(
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    private readonly submissionsRepository: Repository<SubmissionEntity>,
    private readonly chainConfigService: ChainConfigService,
    private readonly web3Service: Web3Service,
    private readonly solanaReaderService: SolanaReaderService,
    private readonly chainProcessingService: SubmissionProcessingService,
    private readonly transformService: TransformService,
  ) { }

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
        await this.solanaReaderService.syncTransactions();
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
   * Processes blockchain events for a given chain within a block range.
   * @param chainId - The ID of the blockchain to process events for.
   * @param from - Optional starting block number (defaults to the last processed block).
   * @param to - Optional ending block number (defaults to the latest confirmed block).
   */
  async process(chainId: number, from?: number, to?: number): Promise<void> {
    const logger = new Logger(`${AddNewEventsAction.name} chainId ${chainId}`);
    logger.verbose(`Processing checkNewEvents - chainId: ${chainId}; from: ${from}; to: ${to}`);

    // Fetch chain details and initialize Web3 provider
    const supportedChain = await this.supportedChainRepository.findOne({ where: { chainId } });
    const chainConfig = this.chainConfigService.get(chainId) as EvmChainConfig;
    const web3 = await this.web3Service.web3HttpProvider(chainConfig);
    const gateContract = new web3.eth.Contract(deBridgeGateAbi as any, chainConfig.debridgeAddr);
    // @ts-ignore
    web3.eth.setProvider = gateContract.setProvider;

    // Set block range: use provided values or defaults
    const toBlock = to ?? (await this.getConfirmedBlockNumber(web3, chainConfig.blockConfirmation));
    let fromBlock = from ?? supportedChain.latestBlock;
    logger.debug(`Getting events from block ${fromBlock} to ${toBlock} on ${supportedChain.network}`);

    // Handle invalid block range (fromBlock > toBlock)
    if (fromBlock > toBlock) {
      logger.error(`Invalid block range: fromBlock (${fromBlock}) > toBlock (${toBlock})`);

      // Find the latest block number for the given chainId from the submissions repository
      const lastEvent = await this.submissionsRepository.findOne({
        where: { chainFrom: chainId },
        order: { blockNumber: 'DESC' }, // Get the highest block number
      });

      const newLatestBlock = lastEvent?.blockNumber ?? toBlock;
      if (!lastEvent) {
        logger.warn(`No events found for chainId ${chainId}. Using toBlock (${toBlock}) as latest.`);
      } else {
        logger.debug(`Found last event block number: ${newLatestBlock} for chainId ${chainId}`);
      }

      await this.supportedChainRepository.update(chainId, { latestBlock: newLatestBlock });
      logger.log(`Updated latestBlock for chainId ${chainId} to ${newLatestBlock}`);
      return;
    }

    for (fromBlock; fromBlock < toBlock; fromBlock += chainConfig.maxBlockRange) {
      const lastBlockOfPage = Math.min(fromBlock + chainConfig.maxBlockRange, toBlock);
      logger.log(`supportedChain.network: ${supportedChain.network} ${fromBlock}-${lastBlockOfPage}`);
      if (supportedChain.latestBlock === lastBlockOfPage) {
        logger.warn(`latestBlock in db ${supportedChain.latestBlock} == lastBlockOfPage ${lastBlockOfPage}`);
        continue;
      }
      const sentEvents = await this.getEvents(gateContract, fromBlock, lastBlockOfPage);
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
      submissions.sort((a, b) => {
        if (a.blockNumber === b.blockNumber) {
          logger.log(
            `Submissions in block#${a.blockNumber} submissionId: ${a.submissionId} nonce:${a.nonce}; submissionId: ${b.submissionId} nonce: ${b.nonce}`,
          );

          return a.nonce - b.nonce;
        }

        return 0;
      });
      const status = await this.chainProcessingService.process(submissions, chainId, lastBlockOfPage, web3);
      if (status !== ProcessNewTransferResultStatusEnum.SUCCESS) {
        break;
      }
    }
  }

  /**
   * Retrieves the block number with the specified number of confirmations.
   * @param web3 - An instance of Web3Custom to interact with the blockchain.
   * @param blockConfirmation - The number of blocks to subtract from the latest block to ensure confirmation.
   * @returns A promise resolving to the block number that has the specified number of confirmations.
   */
  private async getConfirmedBlockNumber(web3: Web3Custom, blockConfirmation: number): Promise<number> {
    // Get the latest block number from the RPC (the most recent block in the blockchain)
    const lastRPCBlock = await web3.eth.getBlockNumber();
    this.logger.debug(`Last rpc block is ${lastRPCBlock}`);
    // Subtract the confirmation count to get the block number considered confirmed
    return lastRPCBlock - blockConfirmation;
  }

  async getEvents(gateContract: Contract, fromBlock: number, toBlock: number) {
    if (fromBlock >= toBlock) return;

    /* get events */
    return await gateContract.getPastEvents('Sent', { fromBlock, toBlock });
  }
}
