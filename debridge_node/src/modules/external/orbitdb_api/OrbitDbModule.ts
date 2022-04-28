import { Global, Module } from '@nestjs/common';
import { OrbitDbService } from './services/OrbitDbService';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        timeout: parseInt(configService.get('ORBITDB_API_REQUEST_TIMEOUT')),
      }),
    }),
  ],
  providers: [OrbitDbService],
  exports: [OrbitDbService],
})
export class OrbitDbModule {}
