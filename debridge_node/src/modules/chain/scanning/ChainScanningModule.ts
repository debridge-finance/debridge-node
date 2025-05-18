import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../../entities/SubmissionEntity';
import { SupportedChainEntity } from '../../../entities/SupportedChainEntity';
import { Web3Service } from '../../web3/services/Web3Service';
import { EvmNewEventsReaderAction } from './services/EvmNewEventsReaderAction';
import { ChainScanningService } from './services/ChainScanningService';
import { ConfigModule } from '@nestjs/config';
import { NonceControllingService } from './services/NonceControllingService';
import { SubmissionProcessingService } from './services/SubmissionProcessingService';
import { SolanaReaderService } from './services/SolanaReaderService';
import { TransformService } from './services/TransformService';
import { SubmissionIdValidationService } from './services/SubmissionIdValidationService';
import { MonitoringSendEventEntity } from '../../../entities/MonitoringSendEventEntity';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), TypeOrmModule.forFeature([SubmissionEntity, SupportedChainEntity, MonitoringSendEventEntity])],
  providers: [
    Web3Service,
    ChainScanningService,
    SubmissionProcessingService,
    EvmNewEventsReaderAction,
    NonceControllingService,
    SolanaReaderService,
    TransformService,
    SubmissionIdValidationService,
  ],
  exports: [ChainScanningService],
})
export class ChainScanningModule {}
