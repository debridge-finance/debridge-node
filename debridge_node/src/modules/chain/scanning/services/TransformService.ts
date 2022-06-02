import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventFromTransaction } from '../../../external/solana_api/dto/response/get.events.from.transactions.response.dto';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../../../enums/SubmisionStatusEnum';
import { UploadStatusEnum } from '../../../../enums/UploadStatusEnum';
import { SubmisionAssetsStatusEnum } from '../../../../enums/SubmisionAssetsStatusEnum';
import { ChainConfigService } from '../../config/services/ChainConfigService';
import { SubmisionBalanceStatusEnum } from '../../../../enums/SubmisionBalanceStatusEnum';
import { Web3Service } from '../../../web3/services/Web3Service';
import { ClassicChainConfig } from '../../config/models/configs/ClassicChainConfig';
import BigNumber from 'bignumber.js';
import { MonitoringSentEventEntity } from '../../../../entities/MonitoringSentEventEntity';

/**
 * Service for data transormation
 */
@Injectable()
export class TransformService {
  constructor(
    private readonly configServive: ConfigService,
    private readonly chainConfigService: ChainConfigService,
    private readonly web3Service: Web3Service,
  ) {}

  generateSubmissionAndMonitorFromSolanaEvent(transaction: EventFromTransaction): {
    submission: SubmissionEntity;
    monitoringEvent: MonitoringSentEventEntity;
  } {
    const submission = new SubmissionEntity();
    submission.submissionId = transaction.submissionId;
    submission.txHash = transaction.transactionHash;
    submission.chainFrom = this.chainConfigService.getSolanaChainId();
    submission.chainTo = transaction.chainToId;
    submission.receiverAddr = transaction.receiver;
    submission.amount = transaction.amount;
    //submission.amount = transaction.amount;
    submission.rawEvent = JSON.stringify(transaction);
    submission.debridgeId = transaction.bridgeId;
    submission.nonce = transaction.nonce;
    //submission.blockNumber = transaction.;
    //submission.externalId = transaction.;
    //submission.signature = transaction.
    //
    submission.status = SubmisionStatusEnum.NEW;
    submission.ipfsStatus = UploadStatusEnum.NEW;
    submission.apiStatus = UploadStatusEnum.NEW;
    submission.assetsStatus = SubmisionAssetsStatusEnum.NEW;
    submission.executionFee = transaction.executionFee;
    submission.blockTimestamp = transaction.transactionTimestamp; //todo
    submission.balanceStatus = SubmisionBalanceStatusEnum.RECIEVED;

    const monitoringEvent = {
      submissionId: submission.submissionId,
      chainId: submission.chainFrom,
      nonce: submission.nonce,
      totalSupply: transaction.tokenTotalSupply,
      lockedOrMintedAmount: transaction.lockedOrMintedAmount,
    } as MonitoringSentEventEntity;

    return { submission, monitoringEvent };
  }

  async generateSubmissionFromSentEvent(sendEvent) {
    const submissionId = sendEvent.returnValues.submissionId;
    return {
      submissionId,
      txHash: sendEvent.transactionHash,
      chainFrom: sendEvent.returnValues.chainIdFrom,
      chainTo: sendEvent.returnValues.chainIdTo,
      debridgeId: sendEvent.returnValues.debridgeId,
      receiverAddr: sendEvent.returnValues.receiver,
      amount: sendEvent.returnValues.amount,
      status: SubmisionStatusEnum.NEW,
      ipfsStatus: UploadStatusEnum.NEW,
      apiStatus: UploadStatusEnum.NEW,
      assetsStatus: SubmisionAssetsStatusEnum.NEW,
      rawEvent: JSON.stringify(sendEvent),
      blockNumber: sendEvent.blockNumber,
      nonce: parseInt(sendEvent.returnValues.nonce),
      blockTimestamp: await this.getBlockTimestamp(sendEvent.returnValues.chainIdFrom, sendEvent.blockNumber),
      balanceStatus: SubmisionBalanceStatusEnum.RECIEVED,
      executionFee: TransformService.getExecutionFee(sendEvent.returnValues.autoParams),
    } as SubmissionEntity;
  }

  async getBlockTimestamp(chainId: number, blockNumber: number) {
    const chainDetail = this.chainConfigService.get(chainId);
    const web3 = await this.web3Service.web3HttpProvider((chainDetail as ClassicChainConfig).providers);
    const block = await web3.eth.getBlock(blockNumber);
    return parseInt(block.timestamp.toString());
  }

  static getExecutionFee(autoParams: string): string {
    if (!autoParams || autoParams.length < 130) {
      return '0';
    }
    const executionFeeDirty = '0x' + autoParams.slice(66, 130);
    const executionFee = new BigNumber(executionFeeDirty);

    return executionFee.toString();
  }
}
