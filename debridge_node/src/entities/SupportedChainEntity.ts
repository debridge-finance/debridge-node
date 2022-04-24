import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('supported_chains')
@Unique(['chainId'])
export class SupportedChainEntity {
  @PrimaryColumn()
  chainId: number;

  @Column()
  network: string;

  @Column({ nullable: true })
  latestBlock: number;

  @Column({ nullable: true })
  latestSolanaTransaction: string;
}
