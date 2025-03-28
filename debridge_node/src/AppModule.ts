import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionEntity } from './entities/SubmissionEntity';
import { SupportedChainEntity } from './entities/SupportedChainEntity';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfirmNewAssetEntity } from './entities/ConfirmNewAssetEntity';
import { DataFixModule } from './datafixes/DataFixModule';
import { DebridgeApiModule } from './modules/external/debridge_api/DebridgeApiModule';
import { Web3Module } from './modules/web3/Web3Module';
import { JobModule } from './modules/jobs/JobModule';
import { ChainConfigModule } from './modules/chain/config/ChainConfigModule';
import { ApiModule } from './modules/api/ApiModule';
import { SolanaEventsReaderModule } from './modules/solana-events-reader/SolanaEventsReaderModule';
import { DataLoaderModule } from './data-loader/data-loader.module';

@Module({
  imports: [
    DataLoaderModule,
    ChainConfigModule,
    DataFixModule,
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        logging: false,
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'localhost'),
        port: configService.get<number>('POSTGRES_PORT', 5432),
        username: configService.get('POSTGRES_USER', 'user'),
        password: configService.get('POSTGRES_PASSWORD', 'password'),
        database: configService.get('POSTGRES_DATABASE', 'postgres'),
        synchronize: true,
        entities: [SubmissionEntity, SupportedChainEntity, ConfirmNewAssetEntity],
      }),
    }),
    TypeOrmModule.forFeature([SubmissionEntity, SupportedChainEntity, ConfirmNewAssetEntity]),
    Web3Module,
    DebridgeApiModule,
    JobModule,
    ApiModule,
    SolanaEventsReaderModule,
  ],
})
export class AppModule {}
