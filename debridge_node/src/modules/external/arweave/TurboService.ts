import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { TurboFactory, ArweaveSigner, TurboAuthenticatedClient } from '@ardrive/turbo-sdk';
import { JWKInterface } from 'arweave/web/lib/wallet';
import { createData } from 'arbundles';

@Injectable()
export class TurboService {
  private readonly logger = new Logger(TurboService.name);
  private isInitializedValue = false;
  private client: TurboAuthenticatedClient;
  private signer: ArweaveSigner;

  constructor(private readonly configService: ConfigService) {
    const path = 'bundlr_wallet.json';
    if (existsSync(path)) {
      const jwk: JWKInterface = this.getJsonWalletInfo(path);
      if (jwk) {
        this.signer = new ArweaveSigner(jwk);
        this.client = TurboFactory.authenticated({
          privateKey: jwk,
        });
        this.isInitializedValue = true;
      } else {
        this.logger.warn(`arweave_wallet.json is not valid`);
      }
    } else {
      this.logger.warn(`arweave_wallet.json is not exists`);
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
    if (!this.isInitializedValue) {
      return;
    }

    this.logger.log('Uploading to arweave is started');
    const signedDataItem = createData(data, this.signer, {
      tags,
    });
    await signedDataItem.sign(this.signer);
    const transaction = await this.client.uploadSignedDataItem({
      dataItemStreamFactory: () => signedDataItem.getRaw(),
      dataItemSizeFactory: () => signedDataItem.getRaw().length,
    });

    this.logger.log(`Uploading to arweave is finished txId=${transaction.id}`);
    return transaction.id;
  }

  private getJsonWalletInfo(path: string) {
    try {
      return JSON.parse(readFileSync(path).toString());
    } catch (e) {
      return null;
    }
  }
}
