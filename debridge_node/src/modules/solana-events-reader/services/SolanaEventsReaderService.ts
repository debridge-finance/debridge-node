import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SolanaGrpcClient } from '@debridge-finance/solana-grpc';

@Injectable()
export class SolanaEventsReaderService {
  readonly #client: SolanaGrpcClient;

  constructor(private readonly configService: ConfigService) {
    const url = configService.get('SOLANA_GRPC_SERVICE_URL');
    this.#client = new SolanaGrpcClient(url);
  }

  getClient(): SolanaGrpcClient {
    return this.#client;
  }
}
