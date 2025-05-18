import Web3 from 'web3';
import { U256Converter } from '@debridge-finance/solana-grpc';
import { createU256 } from './createU256';

const web3 = new Web3();

export interface AutoParams {
  executionFee: string;
  flags: string;
  fallbackAddress: string;
  shortcut?: string;
  nativeSender: string;
  data?: string;
}

export function buildSolanaAutoParams(rawEvent: any): AutoParams | undefined {
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

export function buildEvmAutoParams(rawEvent: any): AutoParams | undefined {
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
