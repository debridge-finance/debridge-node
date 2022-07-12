import { ChainConfig } from './ChainConfig';
import { ChainProvider } from '../ChainProvider';

export class ClassicChainConfig extends ChainConfig {
  debridgeAddr: string;
  providers: ChainProvider;
  blockConfirmation: number;
  maxBlockRange: number;
}
