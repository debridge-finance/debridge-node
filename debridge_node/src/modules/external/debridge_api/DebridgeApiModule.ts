import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DebrdigeApiService } from './services/DebrdigeApiService';

@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        timeout: parseInt(configService.get('DEBRIDGE_API_REQUEST_TIMEOUT')),
      }),
    }),
  ],
  providers: [DebrdigeApiService],
  exports: [DebrdigeApiService],
})
export class DebridgeApiModule {}
