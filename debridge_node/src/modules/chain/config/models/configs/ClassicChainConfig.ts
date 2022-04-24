import { ChainConfig } from './ChainConfig';
import { ChainProvider } from '../ChainProvider';

export class ClassicChainConfig extends ChainConfig {
  debridgeAddr: string;
  firstStartBlock: number;
  providers: ChainProvider;
  blockConfirmation: number;
  maxBlockRange: number;
}
