import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum TransactionState {
  Ok = 'Ok',
  Failed = 'Failed',
  NotDeBridge = 'NotDeBridge',
  Other = 'Other',
}

export class EventFromTransaction {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  amount: string;

  @ApiProperty()
  @IsString()
  receiver: string;

  @ApiProperty()
  @IsString()
  bridgeId: string;

  @ApiProperty({
    type: 'integer',
  })
  @IsInt()
  chainToId: number;

  @ApiProperty({
    type: 'integer',
  })
  @IsInt()
  nonce: number;

  @ApiProperty()
  @IsString()
  submissionId: string;

  @ApiProperty({
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsInt()
  referralCode: number;

  @ApiProperty()
  @IsString()
  executionFee: string;

  @ApiProperty({
    nullable: true,
    required: false,
  })
  @IsString()
  @IsOptional()
  flags: string;

  @ApiProperty({
    nullable: true,
    required: false,
  })
  @IsString()
  @IsOptional()
  fallbackAddress: string;

  @ApiProperty({
    nullable: true,
    required: false,
  })
  @IsString()
  @IsOptional()
  extCallShortcut: string;

  @ApiProperty()
  @IsString()
  nativeSender: string;

  @ApiProperty()
  @IsString()
  fixFee: string;

  @ApiProperty()
  @IsString()
  transferFee: string;

  @ApiProperty()
  @IsBoolean()
  useAssetFee: boolean;

  @ApiProperty()
  @IsString()
  lockedOrMintedAmount: string;

  @ApiProperty()
  @IsString()
  tokenTotalSupply: string;

  @ApiProperty()
  @IsNumber()
  decimalDenominator: number;

  @ApiProperty()
  @IsString()
  receivedAmount: string;
}

export class WrappedEventsFromTransaction {
  @ApiProperty({
    type: 'integer',
  })
  @IsInt()
  slotNumber: number;

  @ApiProperty()
  @IsNumber()
  transactionTimestamp: number;

  @ApiProperty()
  @IsString()
  transactionHash: string;

  @ApiProperty({
    enum: TransactionState,
    enumName: 'TransactionState',
  })
  @IsEnum(TransactionState)
  transactionState: TransactionState;

  @ApiProperty({
    type: EventFromTransaction,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventFromTransaction)
  events: EventFromTransaction[];
}

export class GetTransferredEventsFromTransactionsResponseDto {
  @ApiProperty({
    type: WrappedEventsFromTransaction,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WrappedEventsFromTransaction)
  transactions: WrappedEventsFromTransaction[];
}
