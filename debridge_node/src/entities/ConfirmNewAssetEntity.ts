import { Column, Index, Entity, PrimaryColumn, Unique } from 'typeorm';
import { SubmissionStatusEnum } from '../enums/SubmissionStatusEnum';
import { UploadStatusEnum } from '../enums/UploadStatusEnum';
import { BundlrStatusEnum } from '../enums/BundlrStatusEnum';

@Entity('confirmNewAssets')
@Unique(['deployId'])
export class ConfirmNewAssetEntity {
  @PrimaryColumn()
  debridgeId: string;

  @Column()
  deployId: string;

  @Column()
  nativeChainId: number;

  @Column()
  tokenAddress: string;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column()
  decimals: number;

  @Column()
  submissionTxHash: string;

  @Column()
  submissionChainFrom: number;

  @Column()
  submissionChainTo: number;

  @Column({
    nullable: true,
  })
  signature: string;

  @Column({
    nullable: true,
  })
  bundlrTx: string;

  @Column({
    nullable: true,
  })
  ipfsLogHash: string;

  @Column({
    nullable: true,
  })
  ipfsKeyHash: string;

  //ExternalId of signature in debridge system
  @Column({
    nullable: true,
  })
  externalId: string;

  @Column()
  @Index()
  status: SubmissionStatusEnum;

  @Column()
  @Index()
  ipfsStatus: UploadStatusEnum;

  @Column()
  @Index()
  apiStatus: UploadStatusEnum;

  @Column({ nullable: true })
  @Index()
  bundlrStatus: BundlrStatusEnum;
}
