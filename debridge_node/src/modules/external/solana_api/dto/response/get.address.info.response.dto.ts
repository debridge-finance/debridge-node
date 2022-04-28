import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class GetAddressInfoResponseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tokenName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tokenSymbol: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  tokenDecimals: number;
}
