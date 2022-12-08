import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SubmissionsConfirmationsRequestDTO } from '../dto/request/SubmissionsConfirmationsRequestDTO';
import { SubmissionConfirmationResponse, SubmissionsConfirmationsResponseDTO } from '../dto/response/SubmissionsConfirmationsResponseDTO';
import { Account } from 'web3-core';
import Web3 from 'web3';
import { readFileSync } from 'fs';
import { ProgressInfoDTO, ValidationProgressDTO } from '../dto/request/ValidationProgressDTO';
import { UpdateOrbirDbDTO } from '../dto/request/UpdateOrbirDbDTO';
import { HttpAuthService } from '../../common/HttpAuthService';
import { SubmissionEntity } from '../../../../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../../../../entities/ConfirmNewAssetEntity';
import { ConfrimNewAssetsResponseDTO } from '../dto/response/ConfrimNewAssetsResponseDTO';
import { ConfrimNewAssetsRequestDTO } from '../dto/request/ConfrimNewAssetsRequestDTO';
import { ErrorNotificationDTO } from '../dto/request/ErrorNotificationDTO';
import { Web3Service } from '../../../web3/services/Web3Service';
import { addHttpServiceLogging } from '../../common/addHttpServiceLogging';
import { readConfiguration } from '../../../../utils/readConfiguration';

@Injectable()
export class DebrdigeApiService extends HttpAuthService implements OnModuleInit {
  private readonly updateVersionInterval = 60000; //1m
  private account: Account;
  private web3: Web3;

  constructor(readonly web3Service: Web3Service, readonly httpService: HttpService, private readonly configService: ConfigService) {
    const logger = new Logger(DebrdigeApiService.name);
    const apiBaseUrl = readConfiguration(configService, logger, 'API_BASE_URL');
    super(httpService, logger, apiBaseUrl, '/Account/authenticate');
    this.web3 = web3Service.web3();
    this.account = this.web3.eth.accounts.decrypt(JSON.parse(readFileSync('./keystore.json', 'utf-8')), process.env.KEYSTORE_PASSWORD);
    addHttpServiceLogging(httpService, this.logger);
  }

  async onModuleInit() {
    if (!super.basicUrl || super.basicUrl === '') {
      this.logger.warn(`debridge api is not setuped`);
    }
    const { version } = JSON.parse(readFileSync('./package.json', { encoding: 'utf8' }));
    const updateVersionInterval = setInterval(async () => {
      try {
        await this.updateVersion(version);
        this.logger.log(`Sending event to update node version is finished`);
        clearInterval(updateVersionInterval);
      } catch (e) {
        this.logger.warn(`Error in sending event to update node version`);
      }
    }, this.updateVersionInterval);
  }

  private getLoginDto() {
    const timeStamp = Math.floor(new Date().getTime() / 1000);
    return {
      ethAddress: this.account.address,
      signature: this.account.sign(`${timeStamp}`).signature,
      timeStamp,
      killOtherSessions: false,
    };
  }

  async updateOrbitDb(requestBody: UpdateOrbirDbDTO) {
    this.logger.log(`updateOrbitDb ${requestBody} is started`);
    const httpResult = await this.authRequest('/Validator/updateOrbitDb', requestBody, this.getLoginDto());
    this.logger.verbose(`response: ${httpResult.data}`);
    this.logger.log(`updateOrbitDb is finished`);
  }

  async updateVersion(version: string) {
    this.logger.log(`updateVersion ${version} is started`);
    const httpResult = await this.authRequest('/Validator/setNodeVersion', { version }, this.getLoginDto());

    this.logger.verbose(`response: ${httpResult.data}`);
    this.logger.log(`updateVersion is finished`);
  }

  async uploadToApi(submissions: SubmissionEntity[]): Promise<SubmissionConfirmationResponse[]> {
    if (!super.basicUrl || super.basicUrl === '') {
      return [];
    }
    const requestBody = {
      confirmations: submissions.map(submission => {
        return {
          txHash: submission.txHash,
          signature: submission.signature,
          submissionId: submission.submissionId,
          chainId: submission.chainFrom,
        };
      }),
    } as SubmissionsConfirmationsRequestDTO;
    this.logger.log(`uploadToApi is started`);
    const httpResult = await this.authRequest('/SubmissionConfirmation/confirmations', requestBody, this.getLoginDto());

    this.logger.verbose(`response: ${httpResult.data}`);
    const result = httpResult.data as SubmissionsConfirmationsResponseDTO;
    this.logger.log(`uploadToApi is finished`);
    return result.confirmations;
  }

  async uploadStatistic(progressInfo: ProgressInfoDTO[]) {
    if (!super.basicUrl || super.basicUrl === '') {
      return;
    }
    const requestBody = {
      progressInfo,
    } as ValidationProgressDTO;
    this.logger.log(`uploadStatisticToApi is started`);
    const httpResult = await this.authRequest('/Validator/updateProgress', requestBody, this.getLoginDto());

    this.logger.verbose(`response: ${httpResult.data}`);
    const result = httpResult.data as SubmissionsConfirmationsResponseDTO;
    this.logger.log(`uploadStatisticToApi is finished`);
    return result.confirmations;
  }

  async uploadConfirmNewAssetsToApi(asset: ConfirmNewAssetEntity): Promise<ConfrimNewAssetsResponseDTO> {
    if (!super.basicUrl || super.basicUrl === '') {
      return {
        registrationId: 'empty_basicUrl',
        deployId: 'empty_basicUrl',
      };
    }
    const requestBody = {
      deployId: asset.deployId,
      signature: asset.signature,
      debridgeId: asset.debridgeId,
      nativeChainId: asset.nativeChainId,
      tokenAddress: asset.tokenAddress,
      tokenName: asset.name,
      tokenSymbol: asset.symbol,
      tokenDecimals: asset.decimals,
    } as ConfrimNewAssetsRequestDTO;
    this.logger.log(`uploadConfirmNewAssetsToApi is started`);
    const httpResult = await this.authRequest('/ConfirmNewAssets/confirm', requestBody, this.getLoginDto());

    this.logger.verbose(`response: ${httpResult.data}`);
    const result = httpResult.data as ConfrimNewAssetsResponseDTO;
    this.logger.log(`uploadConfirmNewAssetsToApi is finished`);
    return result;
  }

  async notifyError(message: string) {
    if (!super.basicUrl || super.basicUrl === '') {
      return;
    }
    const requestBody = {
      message,
    } as ErrorNotificationDTO;
    this.logger.log(`notifyError is started; requestBody: ${JSON.stringify(requestBody)}`);
    const httpResult = await this.authRequest('/Validator/notifyError', requestBody, this.getLoginDto());

    this.logger.verbose(`response: ${httpResult.data}`);
    this.logger.log(`notifyError is finished`);
  }
}
