import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { GetHistoricalDataRequestDto } from '../dto/request/get.historical.data.request.dto';
import { GetHistoricalDataResponseDto } from '../dto/response/get.historical.data.response.dto';
import { EventFromTransaction, GetEventsFromTransactionsResponseDto } from '../dto/response/get.events.from.transactions.response.dto';
import { GetEventsFromTransactionsRequestDto } from '../dto/request/get.events.from.transactions.request.dto';
import { GetAddressInfoRequestDto } from '../dto/request/get.address.info.request.dto';
import { GetAddressInfoResponseDto } from '../dto/response/get.address.info.response.dto';
import { GetBridgeInfoRequestDto } from '../dto/request/get.bridge.info.request.dto';
import { lastValueFrom } from 'rxjs';
import { GetBridgeInfoResponseDto } from '../dto/response/get.bridge.info.response.dto';
import { addHttpServiceLogging } from '../../common/addHttpServiceLogging';
import { readConfiguration } from '../../../../utils/readConfiguration';
import { TokenRequestDto } from '../dto/request/token.request.dto';
import { GetTokenDecimalsResponseDto } from '../dto/response/get.token.decimals.response.dto';

@Injectable()
export class SolanaApiService {
  private readonly logger = new Logger(SolanaApiService.name);
  private readonly BASIC_URL: string;

  constructor(readonly httpService: HttpService, private readonly configService: ConfigService) {
    this.BASIC_URL = readConfiguration(configService, this.logger, 'SOLANA_DATA_READER_API_BASE_URL');
    addHttpServiceLogging(httpService, this.logger);
  }

  /**
   * Get historical data
   * @param limitSignatures
   * @param searchFrom
   * @param searchTo
   * @return string[] transaction hashes from solana
   */
  async getHistoricalData(limitSignatures: number, searchFrom?: string, searchTo?: string): Promise<string[]> {
    this.logger.log(`getHistoricalData ${JSON.stringify({ searchFrom, searchTo })} is started`);
    const limit = limitSignatures;
    const dto = { limit, searchFrom, searchTo } as GetHistoricalDataRequestDto;
    this.logger.verbose(`getHistoricalData dto ${JSON.stringify(dto)}`);
    const httpResult = await this.request('/getHistoricalData', dto);
    const { signatures } = httpResult.data as GetHistoricalDataResponseDto;
    this.logger.log(`getHistoricalData ${JSON.stringify({ searchFrom, searchTo })} is finished`);
    return signatures;
  }

  /**
   * Get events from transaction
   * @param signatures
   * @return EventFromTransaction[] detailed information about sendevents by their hashes
   */
  async getEventsFromTransactions(signatures: string[]): Promise<EventFromTransaction[]> {
    this.logger.log(`getEventsFromTransactions to ${JSON.stringify(signatures)} is started`);
    const dto = { signatures } as GetEventsFromTransactionsRequestDto;
    this.logger.verbose(`getEventsFromTransactions dto ${JSON.stringify(dto)}`);
    const httpResult = await this.request('/getEventsFromTransactions', dto);
    const { events } = httpResult.data as GetEventsFromTransactionsResponseDto;
    this.logger.log(`getEventsFromTransactions to ${JSON.stringify(signatures)} is finished`);
    return events;
  }

  /**
   * Get address info
   * @param {string} splTokenMint
   * @return GetAddressInfoResponseDto return tokenName, tokenSymbol by token address
   */
  async getAddressInfo(splTokenMint: string): Promise<GetAddressInfoResponseDto> {
    this.logger.log(`getAddressInfo account ${splTokenMint} is started`);
    const dto = { splTokenMint } as GetAddressInfoRequestDto;
    this.logger.verbose(`getAddressInfo dto ${JSON.stringify(dto)}`);
    const httpResult = await this.request('/getAddressInfo', dto, 'GET');
    const response = httpResult.data as GetAddressInfoResponseDto;
    this.logger.log(`getAddressInfo account ${splTokenMint} is finished`);
    return response;
  }

  /**
   * Get bridge info
   * @param {string} bridgeId
   * @return GetBridgeInfoResponseDto return nativeChainId, nativeTokenAddress, tokenToReceiveAddress by bridge id
   */
  async getBridgeInfo(bridgeId: string): Promise<GetBridgeInfoResponseDto> {
    this.logger.log(`getBridgeInfo ${bridgeId} is started`);
    const dto = { bridgeId } as GetBridgeInfoRequestDto;
    this.logger.verbose(`getBridgeInfo dto ${JSON.stringify(dto)}`);
    const httpResult = await this.request('/getBridgeInfo', dto, 'GET');
    const response = httpResult.data as GetBridgeInfoResponseDto;
    this.logger.log(`getBridgeInfo ${bridgeId} is finished`);
    return response;
  }

  /**
   * Get decimal
   * @return number return decimals
   * @param token
   */
  async getTokenDecimals(token: string): Promise<number> {
    this.logger.log(`getTokenDecimals ${token} is started`);
    const dto = { splTokenMint: token } as TokenRequestDto;
    this.logger.verbose(`getTokenDecimals dto ${JSON.stringify(dto)}`);
    const httpResult = await this.request('/getTokenDecimals', dto, 'GET');
    const response = httpResult.data as GetTokenDecimalsResponseDto;
    this.logger.log(`getTokenDecimals ${token} is finished`);
    return response.decimals;
  }

  private async request<T>(api: string, requestBody: T, method: 'POST' | 'GET' = 'POST') {
    const url = `${this.BASIC_URL}${api}`;
    let httpResult;
    try {
      if (method === 'POST') {
        httpResult = await lastValueFrom(this.httpService.post(url, requestBody));
      } else {
        httpResult = await lastValueFrom(this.httpService.get(url, { params: requestBody }));
      }
    } catch (e) {
      const response = e.response;
      this.logger.error(
        `Error request to ${url} (status: ${response?.status}, message: ${response?.statusText}, data: ${JSON.stringify(response?.data)})`,
      );
      throw e;
    }
    return httpResult;
  }
}
