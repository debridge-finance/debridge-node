import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './modules/api/AppController';
import { SubmissionEntity } from './entities/SubmissionEntity';
import { SupportedChainEntity } from './entities/SupportedChainEntity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './modules/api/auth/jwt.strategy';
import { AuthService } from './modules/api/auth/auth.service';
import { ScheduleModule } from '@nestjs/schedule';
import { SignAction } from './subscribe/actions/SignAction';
import { SubscribeHandler } from './subscribe/SubscribeHandler';
import { CheckAssetsEventAction } from './subscribe/actions/CheckAssetsEventAction';
import { ConfirmNewAssetEntity } from './entities/ConfirmNewAssetEntity';
import { OrbitDbService } from './services/OrbitDbService';
import { UploadToApiAction } from './subscribe/actions/UploadToApiAction';
import { RescanService } from './modules/api/services/RescanService';
import { GetSupportedChainsService } from './modules/api/services/GetSupportedChainsService';
import { UploadToIPFSAction } from './subscribe/actions/UploadToIPFSAction';
import { StatisticToApiAction } from './subscribe/actions/StatisticToApiAction';
import { Web3Service } from './services/Web3Service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { FixNotExistsNonceBlockNumber } from './datafixes/FixNotExistsNonceBlockNumber';
import { DataFixModule } from './datafixes/DataFixModule';
import { ChainConfigModule } from './modules/chain/config/ChainConfigModule';
import { SolanaSyncEntity } from './entities/SolanaSyncEntity';
import { DebridgeApiModule } from './modules/debridge_api/DebridgeApiModule';
import { ChainScanningModule } from './modules/chain/scanning/ChainScanningModule';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ChainConfigModule,
    DataFixModule,
    HttpModule,
    ChainScanningModule,
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
        entities: [SubmissionEntity, SupportedChainEntity, ConfirmNewAssetEntity, SolanaSyncEntity],
      }),
    }),
    TypeOrmModule.forFeature([SubmissionEntity, SupportedChainEntity, ConfirmNewAssetEntity, SupportedChainEntity]),
    DebridgeApiModule,
  ],
  //controllers: [AppController],
  providers: [
    //Web3Service,
    //RescanService,
    //SignAction,
    //UploadToIPFSAction,
    //UploadToApiAction,
    //CheckAssetsEventAction,
    //SubscribeHandler,
    //GetSupportedChainsService,
    //OrbitDbService,
    //StatisticToApiAction,
  ],
})
export class AppModule {}
