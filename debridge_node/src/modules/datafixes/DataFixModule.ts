import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FixNotExistsNonceBlockNumber } from './FixNotExistsNonceBlockNumber';
import { Web3Module } from '../web3/Web3Module';
import { ChainConfigService } from '../chain/config/services/ChainConfigService';
import { FixNotExistsBlockTimestamp } from './FixNotExistsBlockTimestamp';

@Module({
  imports: [ConfigModule, Web3Module, ChainConfigService],
  providers: [FixNotExistsNonceBlockNumber, FixNotExistsBlockTimestamp],
})
export class DataFixModule {}
