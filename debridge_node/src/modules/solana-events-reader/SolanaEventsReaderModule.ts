import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SolanaEventsReaderService } from './services/SolanaEventsReaderService';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SolanaEventsReaderService],
  exports: [SolanaEventsReaderService],
})
export class SolanaEventsReaderModule {}
