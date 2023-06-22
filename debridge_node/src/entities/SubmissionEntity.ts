import { Column, CreateDateColumn, UpdateDateColumn, Entity, Index, PrimaryColumn, Unique } from 'typeorm';
import { SubmisionStatusEnum } from '../enums/SubmisionStatusEnum';
import { SubmisionAssetsStatusEnum } from '../enums/SubmisionAssetsStatusEnum';
import { UploadStatusEnum } from '../enums/UploadStatusEnum';
import { BundlrStatusEnum } from '../enums/BundlrStatusEnum';

@Entity('submissions')
@Unique(['submissionId'])
export class SubmissionEntity {
  @PrimaryColumn()
  submissionId: string;

  @Column()
  txHash: string;

  @Column()
  chainFrom: number;

  @Column()
  @Index()
  chainTo: number;

  @Column()
  debridgeId: string;

  @Column()
  receiverAddr: string;

  @Column()
  amount: string;

  @Column()
  rawEvent: string;

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

  // ExternalId of signature in debridge system
  @Column({
    nullable: true,
  })
  externalId: string;

  @Column()
  @Index()
  status: SubmisionStatusEnum;

  @Column()
  @Index()
  ipfsStatus: UploadStatusEnum;

  @Column()
  @Index()
  apiStatus: UploadStatusEnum;

  @Column({ nullable: true })
  @Index()
  bundlrStatus: BundlrStatusEnum;

  @Column()
  @Index()
  assetsStatus: SubmisionAssetsStatusEnum;

  @Column({ nullable: true })
  @Index()
  nonce: number;

  @Column({ nullable: true })
  @Index()
  blockNumber: number;

  @Column({ nullable: true })
  @Index()
  blockTime: string;

  @Column({ nullable: true, default: 0 })
  decimalDenominator?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
