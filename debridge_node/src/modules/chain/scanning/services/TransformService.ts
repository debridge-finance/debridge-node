import { Injectable } from '@nestjs/common';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { SubmissionStatusEnum } from '../../../../enums/SubmissionStatusEnum';
import { UploadStatusEnum } from '../../../../enums/UploadStatusEnum';
import { SubmissionAssetsStatusEnum } from '../../../../enums/SubmissionAssetsStatusEnum';
import { solanaChainId } from '../../config/services/ChainConfigService';
import { BundlrStatusEnum } from '../../../../enums/BundlrStatusEnum';
import { U256Converter } from '@debridge-finance/solana-grpc';
import { buildEvmAutoParams, buildSolanaAutoParams } from '../../../../utils/buildAutoParams';
import { MonitoringSendEventEntity } from '../../../../entities/MonitoringSendEventEntity';
import { BalanceValidationStatusEnum } from '../../../../enums/BalanceValidationStatusEnum';
import { SubmissionTypeEnum } from '../../../../enums/SubmissionTypeEnum';

/**
 * Service for data transormation
 */
@Injectable()
export class TransformService {
  generateSubmissionFromSolanaSendEvent(sendEvent): SubmissionEntity {
    const isSent = sendEvent.submission?.bridgeInfo?.nativeChainId === sendEvent.submission?.sourceChainId;
    const submission = new SubmissionEntity();
    submission.submissionId = '0x' + U256Converter.toBytesBE(sendEvent.submissionId).toString('hex');
    submission.txHash = '0x' + sendEvent.transactionMetadata.transactionHash.toString('hex');
    submission.chainFrom = solanaChainId;
    submission.chainTo = Number(U256Converter.toBigInt(sendEvent.submission.targetChainId).toString());
    submission.receiverAddr = '0x' + sendEvent.submission.receiver.toString('hex');
    submission.amount = U256Converter.toBigInt(sendEvent.submission.amountToClaim).toString();
    submission.rawEvent = JSON.stringify(sendEvent);
    submission.debridgeId = '0x' + U256Converter.toBytesBE(sendEvent.submission.bridgeId).toString('hex');
    submission.nonce = Number(U256Converter.toBigInt(sendEvent.submission?.nonce).toString());
    submission.blockNumber = sendEvent.transactionMetadata?.blockNumber;
    submission.blockTime = sendEvent.transactionMetadata.blockTime.toString();
    //submission.externalId = transaction.;
    //submission.signature = transaction.
    //
    submission.status = SubmissionStatusEnum.NEW;
    submission.ipfsStatus = UploadStatusEnum.NEW;
    submission.apiStatus = UploadStatusEnum.NEW;
    submission.decimalDenominator = Number(sendEvent.denominator.toString());
    submission.assetsStatus = SubmissionAssetsStatusEnum.NEW;
    submission.bundlrStatus = BundlrStatusEnum.NEW;
    submission.executionFee = buildSolanaAutoParams(sendEvent).executionFee;
    submission.balanceValidationStatus = BalanceValidationStatusEnum.RECEIVED;
    submission.type = isSent ? SubmissionTypeEnum.Sent : SubmissionTypeEnum.Burn;

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
      status: SubmissionStatusEnum.NEW,
      ipfsStatus: UploadStatusEnum.NEW,
      apiStatus: UploadStatusEnum.NEW,
      assetsStatus: SubmissionAssetsStatusEnum.NEW,
      rawEvent: JSON.stringify(sendEvent),
      blockNumber: sendEvent.blockNumber,
      nonce: parseInt(sendEvent.returnValues.nonce),
      bundlrStatus: BundlrStatusEnum.NEW,
      executionFee: buildEvmAutoParams(sendEvent).executionFee,
      balanceValidationStatus: BalanceValidationStatusEnum.RECEIVED,
    } as SubmissionEntity;

    return submission;
  }

  generateMonitoringSendEventFromEvmEvent(sendEvent): MonitoringSendEventEntity {
    return {
      nonce: sendEvent.nonce,
      submissionId: sendEvent.submissionId,
      lockedOrMintedAmount: BigInt(sendEvent.lockedOrMintedAmount),
      totalSupply: BigInt(sendEvent.totalSupply),
      rawEvent: JSON.stringify(sendEvent),
    } as MonitoringSendEventEntity;
  }

  generateMonitoringSendEventFromSolanaEvent(sendEvent): MonitoringSendEventEntity {
    return {
      nonce: Number(U256Converter.toBigInt(sendEvent.submission?.nonce).toString()),
      submissionId: '0x' + U256Converter.toBytesBE(sendEvent.submissionId).toString('hex'),
      lockedOrMintedAmount: U256Converter.toBigInt(sendEvent.bridgeBalanceUpdate.bridgeBalance),
      totalSupply: U256Converter.toBigInt(sendEvent.bridgeBalanceUpdate.totalSupply),
      rawEvent: JSON.stringify(sendEvent),
    } as MonitoringSendEventEntity;
  }
}
