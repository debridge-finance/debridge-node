import { Injectable, Logger } from '@nestjs/common';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import { SetAllChainlinkCookiesAction } from './actions/SetAllChainlinkCookiesAction';
import { CheckConfirmationsAction } from './actions/CheckConfirmationsAction';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedChainEntity } from '../entities/SupportedChainEntity';
import ChainsConfig from '../config/chains_config.json';
import { AddNewEventsAction } from './actions/AddNewEventsAction';
import { CheckNewEvensAction } from './actions/CheckNewEventsAction';
import { CheckAssetsEventAction } from './actions/CheckAssetsEventAction';
import chainConfigs from './../config/chains_config.json';

@Injectable()
export class SubscribeHandler {
  private readonly logger = new Logger(SubscribeHandler.name);
  private isWorking = false;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly setAllChainlinkCookiesAction: SetAllChainlinkCookiesAction,
    private readonly checkConfirmationsAction: CheckConfirmationsAction,
    private readonly addNewEventsAction: AddNewEventsAction,
    private readonly checkNewEvensAction: CheckNewEvensAction,
    private readonly checkAssetsEventAction: CheckAssetsEventAction,
    @InjectRepository(SupportedChainEntity)
    private readonly supportedChainRepository: Repository<SupportedChainEntity>,
  ) {
    this.init();
  }

  async init() {
    await this.uploadConfig();
    await this.setupCheckEventsTimeout();
    await this.setChainLinkCookies();
  }

  private async uploadConfig() {
    for (const config of chainConfigs) {
      const configInDd = await this.supportedChainRepository.findOne({
        chainId: config.chainId,
      });
      if (configInDd) {
        await this.supportedChainRepository.update(config.chainId, {
          latestBlock: config.firstStartBlock,
        });
      } else {
        await this.supportedChainRepository.save({
          chainId: config.chainId,
          latestBlock: config.firstStartBlock,
          network: config.name,
        });
      }
    }
  }

  private async setupCheckEventsTimeout() {
    const chains = await this.supportedChainRepository.find();
    chains.forEach(chain => {
      const intervalName = `inteval_${chain.chainId}`;
      const callback = async () => {
        try {
          if (!this.isWorking) {
            this.isWorking = true;
            await this.addNewEventsAction.action(chain.chainId);
            this.isWorking = false;
          }
        } catch (e) {
          this.logger.error(e);
        }
      };

      const chainDetail = ChainsConfig.find(item => {
        return item.chainId === chain.chainId;
      });

      const interval = setInterval(callback, chainDetail.interval);
      this.schedulerRegistry.addInterval(intervalName, interval);
    });
  }

  @Interval(3000)
  async confirmationChecker() {
    await this.checkConfirmationsAction.action();
  }

  @Interval(3000)
  async checkNewEvents() {
    await this.checkNewEvensAction.action();
  }

  @Interval(3000)
  async checkAssetsEvent() {
    await this.checkAssetsEventAction.action();
  }

  @Interval(864000)
  async setChainLinkCookies() {
    await this.setAllChainlinkCookiesAction.action();
  }
}
