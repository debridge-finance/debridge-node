import { ChainConfig } from './ChainConfig';
import { ChainProvider } from '../ChainProvider';

export class EvmChainConfig extends ChainConfig {
  debridgeAddr: string;
  providers: ChainProvider;
  blockConfirmation: number;
  maxBlockRange: number;
  firstStartBlock: number;
}
