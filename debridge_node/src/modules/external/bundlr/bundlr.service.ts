import { Injectable, Logger } from '@nestjs/common';
import Bundlr from '@bundlr-network/client';
import { readFileSync } from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BundlrService {
  private readonly bundlr: Bundlr;
  private readonly logger = new Logger(BundlrService.name);

  constructor(private readonly configService: ConfigService) {
    const jwk = JSON.parse(readFileSync('bundlr_wallet.json').toString());
    this.bundlr = new Bundlr(this.configService.get('BUNDLR_NODE'), 'arweave', jwk);
  }

  async upload(data: string) {
    this.logger.log('Uploading to bundlr is started');
    const transaction = await this.bundlr.createTransaction(data);
    this.logger.verbose(`TxId ${transaction.id} is created`);
    await transaction.sign();
    this.logger.verbose(`TxId ${transaction.id} is signed`);
    await transaction.upload();
    this.logger.log(`Uploading to bundlr is finished txId=${transaction.id}`);
    return transaction.id;
  }
}
