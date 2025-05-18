import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity('balance_sheet')
@Unique(['debridgeId'])
export class BalanceSheetEntity {
  @PrimaryColumn()
  debridgeId: string;

  @Column()
  chainId: number;

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
  amount: bigint;
}
