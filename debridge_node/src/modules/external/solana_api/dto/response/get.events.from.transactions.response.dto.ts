import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsString, ValidateNested } from 'class-validator';
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
  @IsNumber()
  chainToId: number;

  @ApiProperty()
  @IsNumber()
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

  @ApiProperty()
  @IsNumber()
  referralCode: number;

  @ApiProperty()
  @IsString()
  executionFee: string;

  @ApiProperty()
  @IsString()
  flags: string;

  @ApiProperty()
  @IsString()
  fallbackAddress: string;

  @ApiProperty()
  @IsString()
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
}

export class GetEventsFromTransactionsResponseDto {
  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventFromTransaction)
  events: EventFromTransaction[];
}
