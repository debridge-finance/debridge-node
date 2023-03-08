import { Injectable, Logger } from '@nestjs/common';
import Bundlr from '@bundlr-network/client';
import { readFileSync, existsSync } from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BundlrService {
  private readonly bundlr: Bundlr;
  private readonly logger = new Logger(BundlrService.name);
  private isInitializedValue = false;

  constructor(private readonly configService: ConfigService) {
    const path = 'bundlr_wallet.json';
    if (existsSync(path)) {
      const jwk = JSON.parse(readFileSync(path).toString());
      this.bundlr = new Bundlr(this.configService.get('BUNDLR_NODE'), 'arweave', jwk);
      this.isInitializedValue = true;
    } else {
      this.logger.log(`bundlr_wallet.json is not exists`);
    }
  }

  isInitialized() {
    return this.isInitializedValue;
  }

  async upload(
    data: string,
    tags: {
      name: string;
      value: string;
    }[],
  ) {
    this.logger.log('Uploading to bundlr is started');
    const transaction = await this.bundlr.createTransaction(data, { tags: [...tags, { name: 'App-Name', value: 'Debridge Node' }] });
    await transaction.sign();
    this.logger.verbose(`TxId ${transaction.id} is signed`);
    const uploadTransaction = await transaction.upload();
    this.logger.log(`Uploading to bundlr is finished txId=${transaction.id}`);
    return uploadTransaction.id;
  }
}
