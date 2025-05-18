import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('monitoring_send_events')
export class MonitoringSendEventEntity {
  @PrimaryColumn()
  submissionId: string;

  @Column()
  nonce: number;

  @Column({
    type: 'numeric',
    transformer: {
      to(data: bigint): bigint {
        return data;
      },
      from(data: string): bigint {
        return BigInt(data);
      },
    },
  })
  lockedOrMintedAmount: bigint;

  @Column({
    type: 'numeric',
    transformer: {
      to(data: bigint): bigint {
        return data;
      },
      from(data: string): bigint {
        return BigInt(data);
      },
    },
  })
  totalSupply: bigint;

  @Column()
  rawEvent: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
