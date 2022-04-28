import { Global, Module } from '@nestjs/common';
import { Web3Service } from './services/Web3Service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [Web3Service],
  exports: [Web3Service],
})
export class Web3Module {}
