import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { promisify } from 'util';
import { readConfiguration } from '../../utils/readConfiguration';
import { TransformService } from '../chain/scanning/services/TransformService';

@Injectable()
export class FixNotExistsExecutionFee implements OnModuleInit {
  private readonly logger = new Logger(FixNotExistsExecutionFee.name);
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
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
    if (readConfiguration(this.configService, this.logger, 'ENABLE_DATAFIX_EXECUTION_FEE') !== 'true') {
      await this.pool.end();
      return;
    }
    const queryFunc = promisify(this.pool.query).bind(this.pool);

    this.logger.log(`Start setting ExecutionFee if not exists`);
    let size = 0;
    do {
      const { rows: records } = await queryFunc(`SELECT  "submissionId", "rawEvent" FROM submissions WHERE "executionFee" IS NULL LIMIT 100`);
      size = records.length;
      await Promise.allSettled(
        records.map(submission => {
          const { submissionId, rawEvent } = submission;
          const rawEventJson = JSON.parse(rawEvent);
          const executionFee = TransformService.getExecutionFee(rawEventJson.returnValues.autoParams);
          this.logger.log(`ExecutionFee was added to submission ${submissionId}`);
          return queryFunc('UPDATE submissions SET "executionFee" = $1 WHERE "submissionId" = $2', [executionFee.toString(), submissionId]);
        }),
      );
    } while (size > 0);

    await this.pool.end();
    this.logger.log(`Finish setting ExecutionFee if not exists`);
  }
}
