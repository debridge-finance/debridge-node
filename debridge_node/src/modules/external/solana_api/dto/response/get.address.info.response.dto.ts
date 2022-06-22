import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetAddressInfoResponseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tokenName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tokenSymbol: string;
}
