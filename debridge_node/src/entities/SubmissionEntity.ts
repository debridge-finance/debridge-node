import { Column, CreateDateColumn, UpdateDateColumn, Entity, Index, PrimaryColumn, Unique } from 'typeorm';
import { SubmissionStatusEnum } from '../enums/SubmissionStatusEnum';
import { SubmissionAssetsStatusEnum } from '../enums/SubmissionAssetsStatusEnum';
import { UploadStatusEnum } from '../enums/UploadStatusEnum';
import { BundlrStatusEnum } from '../enums/BundlrStatusEnum';
import { BalanceValidationStatusEnum } from '../enums/BalanceValidationStatusEnum';
import { SubmissionTypeEnum } from '../enums/SubmissionTypeEnum';

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
  status: SubmissionStatusEnum;

  @Column()
  @Index()
  ipfsStatus: UploadStatusEnum;

  @Column()
  @Index()
  apiStatus: UploadStatusEnum;

  @Column({ nullable: true })
  @Index()
  balanceValidationStatus?: BalanceValidationStatusEnum;

  @Column({ nullable: true })
  @Index()
  bundlrStatus?: BundlrStatusEnum;

  @Column()
  @Index()
  assetsStatus: SubmissionAssetsStatusEnum;

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

  @Column({ nullable: true })
  type?: SubmissionTypeEnum;

  @Column({ nullable: true })
  executionFee?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
