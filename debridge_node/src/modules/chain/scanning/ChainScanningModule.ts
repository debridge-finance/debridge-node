import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../../entities/SubmissionEntity';
import { SupportedChainEntity } from '../../../entities/SupportedChainEntity';
import { Web3Service } from '../../web3/services/Web3Service';
import { AddNewEventsAction } from './services/AddNewEventsAction';
import { ChainScanningService } from './services/ChainScanningService';
import { ConfigModule } from '@nestjs/config';
import { NonceControllingService } from './services/NonceControllingService';
import { SubmissionProcessingService } from './services/SubmissionProcessingService';
import { SolanaReaderService } from './services/SolanaReaderService';
import { TransformService } from './services/TransformService';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), TypeOrmModule.forFeature([SubmissionEntity, SupportedChainEntity])],
  providers: [
    Web3Service,
    ChainScanningService,
    SubmissionProcessingService,
    AddNewEventsAction,
    NonceControllingService,
    SolanaReaderService,
    TransformService,
  ],
  exports: [ChainScanningService],
})
export class ChainScanningModule {}
