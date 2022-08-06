import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('supported_chains')
export class SupportedChainEntity {
  @PrimaryColumn()
  chainId: number;

  @Column()
  network: string;

  @Column()
  latestBlock: number;

  @Column({ nullable: true })
  latestSolanaTransaction: string;

  @Column({ nullable: true })
  lastTransactionSlotNumber: number;

  @Column({ nullable: true })
  lastTxTimestamp: string;
}
