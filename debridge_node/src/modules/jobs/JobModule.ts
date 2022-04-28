import { Module } from '@nestjs/common';
import { CheckAssetsEventAction } from './services/actions/CheckAssetsEventAction';
import { SignAction } from './services/actions/SignAction';
import { StatisticToApiAction } from './services/actions/StatisticToApiAction';
import { UploadToApiAction } from './services/actions/UploadToApiAction';
import { UploadToIPFSAction } from './services/actions/UploadToIPFSAction';
import { JobService } from './JobService';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionEntity } from '../../entities/SubmissionEntity';
import { SupportedChainEntity } from '../../entities/SupportedChainEntity';
import { ConfirmNewAssetEntity } from '../../entities/ConfirmNewAssetEntity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SubmissionEntity, SupportedChainEntity, ConfirmNewAssetEntity])],
  providers: [CheckAssetsEventAction, SignAction, StatisticToApiAction, UploadToApiAction, UploadToIPFSAction, JobService],
})
export class JobModule {}
