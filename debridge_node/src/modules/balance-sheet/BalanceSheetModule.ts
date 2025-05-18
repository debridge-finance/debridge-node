import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { MonitoringSendEventEntity } from '../../entities/MonitoringSendEventEntity';
import { BalanceSheetEntity } from '../../entities/BalanceSheetEntity';
import { ValidateSynchronizationService } from './services/utils/ValidateSynchronizationService';
import { BalanceValidationStatusService } from './services/utils/BalanceValidationStatusService';
import { DebridgeValidationService } from './services/utils/DebridgeValidationService';
import { SubmissionDataService } from './services/utils/SubmissionDataService';
import { BalanceSheetInitializatorService } from './services/utils/BalanceSheetInitializatorService';
import { BalanceProcessorService } from './services/BalanceProcessorService';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { BalanceValidationService } from './services/BalanceValidationService';

@Module({
  imports: [TypeOrmModule.forFeature([SubmissionEntity, MonitoringSendEventEntity, BalanceSheetEntity, SupportedChainEntity])],
  providers: [
    DebridgeValidationService,
    ValidateSynchronizationService,
    BalanceValidationStatusService,
    BalanceValidationService,
    SubmissionDataService,
    BalanceSheetInitializatorService,
    BalanceProcessorService,
  ],
  exports: [BalanceProcessorService],
})
export class BalanceSheetModule {}
