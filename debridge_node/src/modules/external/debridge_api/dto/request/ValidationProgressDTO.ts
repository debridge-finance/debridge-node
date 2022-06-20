import { IsArray, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProgressInfoDTO {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  chainId: number;

  @ApiProperty()
  @IsNumber()
  lastBlock: number;

  @ApiProperty()
  @IsNumber()
  lastTxHash: string;

  @ApiProperty()
  @IsNumber()
  lastTxTimestamp: string;

  @ApiProperty()
  @IsNumber()
  lastTransactionSlotNumber: number;
}

export class ValidationProgressDTO {
  @IsArray()
  @Type(() => ProgressInfoDTO)
  progressInfo: ProgressInfoDTO[];
}
