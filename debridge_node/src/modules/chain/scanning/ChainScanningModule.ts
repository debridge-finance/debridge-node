import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ChainConfigModule } from '../config/ChainConfigModule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../../entities/SubmissionEntity';
import { SupportedChainEntity } from '../../../entities/SupportedChainEntity';
import { Web3Service } from '../../../services/Web3Service';
import { AddNewEventsAction } from './services/AddNewEventsAction';
import { ChainScanningService } from './services/ChainScanningService';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DebridgeApiModule } from '../../debridge_api/DebridgeApiModule';
import { NonceControllingService } from './services/NonceControllingService';
import { SubmissionProcessingService } from './services/SubmissionProcessingService';
import { SolanaApiService } from './services/solana/SolanaApiService';
import { SolanaReaderService } from './services/solana/SolanaReaderService';
import { SolanaUploadOldService } from './services/solana/SolanaUploadOldService';
import { TransformService } from './services/TransformService';
import { HttpModule } from '@nestjs/axios';
import { SolanaSyncEntity } from '../../../entities/SolanaSyncEntity';

@Module({
  imports: [
    DebridgeApiModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    ChainConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        timeout: parseInt(configService.get('SOLANA_API_REQUEST_TIMEOUT')),
      }),
    }),
    TypeOrmModule.forFeature([SubmissionEntity, SupportedChainEntity, SolanaSyncEntity]),
  ],
  providers: [
    Web3Service,
    ChainScanningService,
    AddNewEventsAction,
    NonceControllingService,
    SubmissionProcessingService,
    SolanaApiService,
    SolanaReaderService,
    SolanaUploadOldService,
    TransformService,
  ],
  exports: [ChainScanningService],
})
export class ChainScanningModule {}
