import { U256 } from '@debridge-finance/solana-grpc/dist/types/proto/debridge_common';

export const createU256 = (obj): U256 => {
  const res = {};
  Object.keys(obj).forEach(_ => {
    if (typeof obj[_] === 'string') res[_] = BigInt(obj[_]);
  });

  return res as U256;
};
