import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetHistoricalDataRequestDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  searchFrom?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  searchTo?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit: number;
}
