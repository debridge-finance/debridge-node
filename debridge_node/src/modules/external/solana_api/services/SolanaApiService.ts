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

@Injectable()
export class SolanaApiService {
  private readonly logger = new Logger(SolanaApiService.name);
  private readonly BASIC_URL: string;

  constructor(readonly httpService: HttpService, private readonly configService: ConfigService) {
    this.BASIC_URL = configService.get('SOLANA_DATA_READER_API_BASE_URL');
  }

  /**
   * Get historical data
   * @param limitSignatures
   * @param searchFrom
   * @param searchTo
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
   * @param address
   */
  async getAddressInfo(address: string): Promise<GetAddressInfoResponseDto> {
    this.logger.log(`getAddressInfo account ${address} is started`);
    const dto = { address } as GetAddressInfoRequestDto;
    this.logger.verbose(`getAddressInfo dto ${JSON.stringify(dto)}`);
    const httpResult = await this.request('/getAddressInfo', dto, 'GET');
    const response = httpResult.data as GetAddressInfoResponseDto;
    this.logger.log(`getAddressInfo account ${address} is finished`);
    return response;
  }

  /**
   * Get bridge info
   * @param bridgeId
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
