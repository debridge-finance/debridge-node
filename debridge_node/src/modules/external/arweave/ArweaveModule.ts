import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TurboService } from './TurboService';

@Module({
  imports: [ConfigModule],
  providers: [TurboService],
  exports: [TurboService],
})
export class ArweaveModule {}
