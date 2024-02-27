import Web3 from 'web3';
import { crypto, constants } from '@debridge-finance/solana-utils';
import { SubmissionEntity } from '../entities/SubmissionEntity';
import { U256Converter } from '@debridge-finance/solana-grpc';
import { createU256 } from './createU256';

const web3 = new Web3();

interface AutoParams {
  executionFee: string;
  flags: string;
  fallbackAddress: string;
  shortcut?: string;
  nativeSender: string;
  data?: string;
}

function buildSolanaAutoParams(rawEvent: any): AutoParams | undefined {
  if (!rawEvent.submissionParams) {
    return undefined;
  }
  return {
    executionFee: U256Converter.toBigInt(createU256(rawEvent.submissionParams.executionFee)).toString(),
    flags: U256Converter.toBigInt(createU256(rawEvent.submissionParams.reservedFlag)).toString(),
    fallbackAddress: '0x' + Buffer.from(rawEvent.submissionParams.fallbackAddress.data).toString('hex'),
    shortcut: '0x' + U256Converter.toBytesBE(createU256(rawEvent.submissionParams.hashOfExternalCall)).toString('hex'),
    nativeSender: '0x' + Buffer.from(rawEvent.submissionParams.nativeSender.data).toString('hex'),
  };
}

function buildEvmAutoParams(rawEvent: any): AutoParams | undefined {
  const { returnValues } = rawEvent;
  const { autoParams: autoParamsInput } = returnValues;
  if (!autoParamsInput) {
    return undefined;
  }
  const submissionAutoParams = web3.eth.abi.decodeParameters(
    [
      {
        SubmissionAutoParamsTo: {
          executionFee: 'uint256',
          flags: 'uint256',
          fallbackAddress: 'bytes',
          data: 'bytes',
        },
      },
    ],
    autoParamsInput,
  )[0];

  return {
    executionFee: submissionAutoParams.executionFee,
    fallbackAddress: submissionAutoParams.fallbackAddress,
    data: submissionAutoParams.data,
    flags: submissionAutoParams.flags,
    nativeSender: returnValues.nativeSender,
  };
}

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
