import { Module } from '@nestjs/common';
import { BundlrService } from './bundlr.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [BundlrService],
  exports: [BundlrService],
})
export class BundlrModule {}
