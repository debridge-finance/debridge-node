import { Injectable } from '@nestjs/common';
import { EventFromTransaction } from '../../../external/solana_api/dto/response/get.events.from.transactions.response.dto';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../../../enums/SubmisionStatusEnum';
import { UploadStatusEnum } from '../../../../enums/UploadStatusEnum';
import { SubmisionAssetsStatusEnum } from '../../../../enums/SubmisionAssetsStatusEnum';
import { ChainConfigService } from '../../config/services/ChainConfigService';
import { BundlrStatusEnum } from '../../../../enums/BundlrStatusEnum';

export class SolanaEvent extends EventFromTransaction {
  slotNumber: number;

  transactionHash: string;
}

/**
 * Service for data transormation
 */
@Injectable()
export class TransformService {
  constructor(private readonly chainConfigService: ChainConfigService) {}

  generateSubmissionFromSolanaEvent(transaction: SolanaEvent): SubmissionEntity {
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
    submission.blockNumber = transaction.slotNumber;
    //submission.externalId = transaction.;
    //submission.signature = transaction.
    //
    submission.status = SubmisionStatusEnum.NEW;
    submission.ipfsStatus = UploadStatusEnum.NEW;
    submission.apiStatus = UploadStatusEnum.NEW;
    submission.decimalDenominator = transaction.decimalDenominator;
    submission.assetsStatus = SubmisionAssetsStatusEnum.NEW;
    submission.bundlrStatus = BundlrStatusEnum.NEW;

    return submission;
  }

  generateSubmissionFromSentEvent(sendEvent): SubmissionEntity {
    const submissionId = sendEvent.returnValues.submissionId;
    const submission = {
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
      bundlrStatus: BundlrStatusEnum.NEW,
    } as SubmissionEntity;

    return submission;
  }
}
