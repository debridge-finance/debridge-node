import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class GetBridgeInfoResponseDto {
  @ApiProperty()
  @IsNumber()
  nativeChainId: number;

  @ApiProperty()
  @IsString()
  nativeTokenAddress: string;

  @ApiProperty()
  @IsString()
  tokenToReceiveAddress: string;
}
