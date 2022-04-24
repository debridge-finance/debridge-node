import { Global, Module } from '@nestjs/common';
import { ChainConfigService } from './services/ChainConfigService';

@Global()
@Module({
  providers: [ChainConfigService],
  exports: [ChainConfigService],
})
export class ChainConfigModule {}
