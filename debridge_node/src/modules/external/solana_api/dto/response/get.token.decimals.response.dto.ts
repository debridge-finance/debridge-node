import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class GetTokenDecimalsResponseDto {
  @ApiProperty()
  @IsNumber()
  decimals: number;
}
