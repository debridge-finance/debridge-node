import { crypto, constants } from '@debridge-finance/solana-utils';
import { SubmissionEntity } from '../entities/SubmissionEntity';
import { buildSolanaAutoParams, buildEvmAutoParams } from './buildAutoParams';

export const buildSubmissionId = (submission: SubmissionEntity): string => {
  const rawEvent = JSON.parse(submission.rawEvent);

  const autoParams = submission.chainFrom === constants.SOLANA_CHAIN_ID ? buildSolanaAutoParams(rawEvent) : buildEvmAutoParams(rawEvent);

  return crypto.hashSubmissionIdRaw({
    receiver: submission.receiverAddr,
    debridgeId: submission.debridgeId,
    sourceChainId: submission.chainFrom,
    targetChainId: submission.chainTo,
    amount: submission.amount,
    nonce: submission.nonce,
    autoParams,
  });
};
