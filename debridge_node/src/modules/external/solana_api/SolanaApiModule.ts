import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { SolanaApiService } from './services/SolanaApiService';

@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        timeout: parseInt(configService.get('SOLANA_API_REQUEST_TIMEOUT')),
      }),
    }),
  ],
  providers: [SolanaApiService],
  exports: [SolanaApiService],
})
export class SolanaApiModule {}
