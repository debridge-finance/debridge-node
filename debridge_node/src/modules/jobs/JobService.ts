import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SignAction } from './services/actions/SignAction';
import { UploadToApiAction } from './services/actions/UploadToApiAction';
import { CheckAssetsEventAction } from './services/actions/CheckAssetsEventAction';
import { StatisticToApiAction } from './services/actions/StatisticToApiAction';
import { UploadToArweaveAction } from './services/actions/UploadToArweaveAction';

@Injectable()
export class JobService {
  constructor(
    private readonly signAction: SignAction,
    private readonly uploadToApiAction: UploadToApiAction,
    private readonly checkAssetsEventAction: CheckAssetsEventAction,
    private readonly statisticToApiAction: StatisticToApiAction,
    private readonly uploadToBundlrAction: UploadToArweaveAction,
  ) {}

  @Cron('*/3 * * * * *')
  async Sign() {
    await this.signAction.action();
  }

  @Cron('*/3 * * * * *')
  async UploadToApiAction() {
    await this.uploadToApiAction.action();
  }

  @Cron('*/3 * * * * *')
  async checkAssetsEvent() {
    await this.checkAssetsEventAction.action();
  }

  @Cron('* * * * *')
  async UploadStatisticToApiAction() {
    await this.statisticToApiAction.action();
  }

  @Cron('*/3 * * * * *')
  async UploadToBundlr() {
    await this.uploadToBundlrAction.action();
  }
}
