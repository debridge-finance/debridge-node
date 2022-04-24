import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('solana_sync')
@Unique(['chainId'])
export class SolanaSyncEntity {
  @PrimaryColumn()
  chainId: number;

  @Column()
  synced: boolean;

  @Column({ nullable: true })
  earliestTransaction?: string;
}
