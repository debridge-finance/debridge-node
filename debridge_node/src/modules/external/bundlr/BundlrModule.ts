import { Module } from '@nestjs/common';
import { BundlrService } from './BundlrService';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [BundlrService],
  exports: [BundlrService],
})
export class BundlrModule {}
