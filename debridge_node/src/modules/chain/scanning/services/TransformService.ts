import { Injectable } from '@nestjs/common';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { SubmisionStatusEnum } from '../../../../enums/SubmisionStatusEnum';
import { UploadStatusEnum } from '../../../../enums/UploadStatusEnum';
import { SubmisionAssetsStatusEnum } from '../../../../enums/SubmisionAssetsStatusEnum';
import { solanaChainId } from '../../config/services/ChainConfigService';
import { BundlrStatusEnum } from '../../../../enums/BundlrStatusEnum';
import { U256Converter } from '@debridge-finance/solana-grpc';

/**
 * Service for data transormation
 */
@Injectable()
export class TransformService {
  generateSubmissionFromSolanaSendEvent(sendEvent): SubmissionEntity {
    const submission = new SubmissionEntity();
    submission.submissionId = '0x' + U256Converter.toBytesBE(sendEvent.submissionId).toString('hex');
    submission.txHash = sendEvent.transactionMetadata.transactionHash.toString('hex');
    submission.chainFrom = solanaChainId;
    submission.chainTo = Number(U256Converter.toBigInt(sendEvent.submission.targetChainId).toString());
    submission.receiverAddr = '0x' + sendEvent.submission.receiver.toString('hex');
    submission.amount = U256Converter.toBigInt(sendEvent.submission.amountToClaim).toString();
    submission.rawEvent = JSON.stringify(sendEvent);
    submission.debridgeId = '0x' + U256Converter.toBytesBE(sendEvent.submission.bridgeId).toString('hex');
    submission.nonce = Number(U256Converter.toBigInt(sendEvent.submission?.nonce).toString());
    submission.blockNumber = sendEvent.transactionMetadata?.blockNumber;
    submission.blockTime = new Date(Number(sendEvent.transactionMetadata.blockTime.toString()) * 1000).toString();
    //submission.externalId = transaction.;
    //submission.signature = transaction.
    //
    submission.status = SubmisionStatusEnum.NEW;
    submission.ipfsStatus = UploadStatusEnum.NEW;
    submission.apiStatus = UploadStatusEnum.NEW;
    submission.decimalDenominator = Number(sendEvent.denominator.toString());
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
