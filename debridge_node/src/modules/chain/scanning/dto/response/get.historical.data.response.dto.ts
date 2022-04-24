import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class GetHistoricalDataResponseDto {
  @ApiProperty()
  @IsArray()
  signatures: string[];
}
