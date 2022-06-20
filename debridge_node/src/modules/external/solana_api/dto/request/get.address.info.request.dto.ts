import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetAddressInfoRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  splTokenMint: string;
}
