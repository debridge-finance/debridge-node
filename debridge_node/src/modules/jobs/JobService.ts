import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SignAction } from './services/actions/SignAction';
import { UploadToApiAction } from './services/actions/UploadToApiAction';
import { CheckAssetsEventAction } from './services/actions/CheckAssetsEventAction';
import { StatisticToApiAction } from './services/actions/StatisticToApiAction';
import { ValidationBalanceAction } from './services/actions/ValidationBalanceAction';

@Injectable()
export class JobService {
  constructor(
    private readonly signAction: SignAction,
    private readonly uploadToApiAction: UploadToApiAction,
    private readonly checkAssetsEventAction: CheckAssetsEventAction,
    private readonly statisticToApiAction: StatisticToApiAction,
    private readonly validationBalanceAction: ValidationBalanceAction,
  ) {}

  @Cron('*/3 * * * * *')
  async Sign() {
    await this.signAction.action();
  }

  //TODO: comment out when go orbitDb will ready
  // @Cron('*/3 * * * * *')
  // async UploadToIPFSAction() {
  //   await this.uploadToIPFSAction.action();
  // }

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
  async ValidateBalanceAction() {
    await this.validationBalanceAction.action();
  }
}
