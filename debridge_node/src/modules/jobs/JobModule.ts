import { Module } from '@nestjs/common';
import { CheckAssetsEventAction } from './services/actions/CheckAssetsEventAction';
import { SignAction } from './services/actions/SignAction';
import { StatisticToApiAction } from './services/actions/StatisticToApiAction';
import { UploadToApiAction } from './services/actions/UploadToApiAction';
import { JobService } from './JobService';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';
import { StartScanningService } from './services/StartScanningService';
import { ChainScanningModule } from '../chain/scanning/ChainScanningModule';
import { UploadToArweaveAction } from './services/actions/UploadToArweaveAction';
import { ArweaveModule } from '../external/arweave/ArweaveModule';

@Module({
  imports: [
    ArweaveModule,
    ConfigModule,
    TypeOrmModule.forFeature([SubmissionEntity, SupportedChainEntity, ConfirmNewAssetEntity]),
    ChainScanningModule,
  ],
  providers: [StartScanningService, CheckAssetsEventAction, SignAction, StatisticToApiAction, UploadToApiAction, UploadToArweaveAction, JobService],
})
export class JobModule {}
