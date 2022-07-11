import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

  @ApiProperty()
  @IsInt()
  chainToId: number;

  @ApiProperty()
  @IsInt()
  nonce: number;

  @ApiProperty()
  @IsNumber()
  transactionTimestamp: number;

  @ApiProperty()
  @IsString()
  transactionHash: string;

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

  @ApiProperty()
  @IsNumber()
  slotNumber: number;
}

export class GetEventsFromTransactionsResponseDto {
  @ApiProperty({
    type: EventFromTransaction,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventFromTransaction)
  events: EventFromTransaction[];
}
