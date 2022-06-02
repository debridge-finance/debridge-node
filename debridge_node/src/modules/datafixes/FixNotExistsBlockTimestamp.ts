import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { promisify } from 'util';
import { abi as deBridgeGateAbi } from '../../assets/DeBridgeGate.json';
import { ChainConfigService } from '../chain/config/services/ChainConfigService';
import { Web3Service } from '../web3/services/Web3Service';
import { ClassicChainConfig } from '../chain/config/models/configs/ClassicChainConfig';
import { readConfiguration } from '../../utils/readConfiguration';

@Injectable()
export class FixNotExistsBlockTimestamp implements OnModuleInit {
  private readonly logger = new Logger(FixNotExistsBlockTimestamp.name);
  private readonly pool: Pool;

  constructor(
    private readonly configService: ConfigService,
    private readonly chainConfigService: ChainConfigService,
    private readonly web3Service: Web3Service,
  ) {
    this.pool = new Pool({
      host: configService.get('POSTGRES_HOST', 'localhost'),
      port: configService.get<number>('POSTGRES_PORT', 5432),
      user: configService.get('POSTGRES_USER', 'user'),
      password: configService.get('POSTGRES_PASSWORD', 'password'),
      database: configService.get('POSTGRES_DATABASE', 'postgres'),
    });
  }

  async onModuleInit() {
    this.logger.log('datafix service started');
    if (readConfiguration(this.configService, this.logger, 'ENABLE_DATAFIX_EXECUTION_FEE')) {
      await this.pool.end();
      return;
    }

    const chains = this.chainConfigService.getChains();
    for (const chainId of chains) {
      const queryFunc = promisify(this.pool.query).bind(this.pool);
      this.logger.log(`Start setting BlockNumerTimestamp if not exists`);
      let size = 0;
      const chainDetail = this.chainConfigService.get(chainId) as ClassicChainConfig;
      if (chainDetail.isSolana) {
        continue;
      }
      const web3 = await this.web3Service.web3HttpProvider(chainDetail.providers);
      const contract = new web3.eth.Contract(deBridgeGateAbi as any, chainDetail.debridgeAddr);
      // @ts-ignore
      web3.eth.setProvider = contract.setProvider;
      do {
        const { rows: records } = await queryFunc(
          `SELECT  "submissionId", "blockNumber" FROM submissions WHERE "blockTimestamp" IS NULL AND "chainFrom" = $1 LIMIT 100`,
          [chainId],
        );
        size = records.length;

        await Promise.allSettled(
          records.map(async submission => {
            const { submissionId, blockNumber } = submission;
            const block = await web3.eth.getBlock(blockNumber);
            const blockTimestamp = parseInt(block.timestamp.toString());

            this.logger.log(`BlockNumerTimestamp was added to submission: ${submissionId}`);
            return queryFunc('UPDATE submissions SET "blockTimestamp" = $1 WHERE "submissionId" = $2', [blockTimestamp, submissionId]);
          }),
        );
      } while (size > 0);
    }

    await this.pool.end();
    this.logger.log(`Finish setting BlockNumerTimestamp if not exists`);
  }
}
