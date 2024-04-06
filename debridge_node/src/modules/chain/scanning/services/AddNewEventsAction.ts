import { Injectable, Logger } from '@nestjs/common';
import { abi as deBridgeGateAbi } from '../../../../assets/DeBridgeGate.json';
import { Web3Service } from '../../../web3/services/Web3Service';
import { SolanaReaderService } from './SolanaReaderService';
import { ChainConfigService } from '../../config/services/ChainConfigService';
import { EvmChainConfig } from '../../config/models/configs/EvmChainConfig';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { SupportedChainEntity } from '../../../../entities/SupportedChainEntity';
import { EntityManager, Repository } from 'typeorm';
import { SubmissionProcessingService } from './SubmissionProcessingService';
import { TransformService } from './TransformService';
import { ProcessNewTransferResultStatusEnum } from '../enums/ProcessNewTransferResultStatusEnum';
import Contract from 'web3-eth-contract';

@Injectable()
export class AddNewEventsAction {
  private readonly logger = new Logger(AddNewEventsAction.name);
  private readonly locker = new Map();

  constructor(
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
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

    const web3 = await this.web3Service.web3HttpProvider(chainDetail);

    const registerInstance = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);
    // @ts-ignore
    web3.eth.setProvider = registerInstance.setProvider;

    const toBlock = to || (await web3.eth.getBlockNumber()) - chainDetail.blockConfirmation;
    let fromBlock = from || supportedChain.latestBlock;

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
      const status = await this.chainProcessingService.process(submissions, chainId, lastBlockOfPage, web3);
      if (status !== ProcessNewTransferResultStatusEnum.SUCCESS) {
        break;
      }
    }

    await this.validateAndUpdateProgressWithLatestNonce(registerInstance, chainId);
  }

  private async validateAndUpdateProgressWithLatestNonce(contract: Contract, chainId: number): Promise<void> {
    const logger = new Logger(`${AddNewEventsAction.name} chainId ${chainId} validateAndUpdateProgressWithLatestNonce`);

    const lastNonceFromContract = Number(await contract.methods.nonce().call());
    logger.verbose(`lastNonceFromContract ${lastNonceFromContract}`);

    const recordsDbWithMaxNonce = await this.entityManager.query(
      `SELECT submissions.nonce as nonce, submissions."blockNumber" as "blockNumber"
      FROM public.submissions as submissions
        JOIN (SELECT "chainFrom", MAX(nonce) as nonce
              FROM public.submissions as submissions
              JOIN public.supported_chains as chains
              ON (chains."chainId" = submissions."chainFrom")
              WHERE (submissions."blockNumber" <= chains."latestBlock"  OR chains."chainId"='7565164')  GROUP BY "chainFrom")
        as nonces
        ON (nonces."chainFrom" = submissions."chainFrom" AND nonces.nonce = submissions.nonce)
      WHERE submissions."chainFrom" = ${chainId}
      `,
    );
    logger.verbose(`records from database ${JSON.stringify(recordsDbWithMaxNonce)}`);
    if (!recordsDbWithMaxNonce.length) {
      return;
    }
    const recordDbWithMaxNonce = recordsDbWithMaxNonce[0];

    const lastNonceFromDb = recordDbWithMaxNonce.nonce;
    if (lastNonceFromContract > lastNonceFromDb) {
      const blockNumberWithLastNonceFromDb = recordDbWithMaxNonce.blockNumber;
      logger.verbose(`blockNumberWithLastNonceFromDb ${blockNumberWithLastNonceFromDb}`);

      await this.supportedChainRepository.update(chainId, {
        latestBlock: blockNumberWithLastNonceFromDb,
      });

      logger.log(`last processed block is update with value ${blockNumberWithLastNonceFromDb}`);
    }
  }

  async getEvents(registerInstance: Contract, fromBlock: number, toBlock: number) {
    if (fromBlock >= toBlock) return;

    /* get events */
    return await registerInstance.getPastEvents('Sent', { fromBlock, toBlock });
  }
}
