import { ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetEventsFromTransactionsRequestDto {
  @ApiProperty()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  signatures: string[];
}
