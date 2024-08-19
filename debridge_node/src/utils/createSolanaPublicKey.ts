import { PublicKey } from '@solana/web3.js';

export const createSolanaPublicKey = (address: string | Uint8Array): PublicKey => {
  if (typeof address === 'string' && address.startsWith('0x')) {
    return new PublicKey(Buffer.from(address.slice(2), 'hex'));
  }
  return new PublicKey(address);
};
