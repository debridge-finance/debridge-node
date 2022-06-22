import { ApiProperty } from '@nestjs/swagger';
import { Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint()
class SolanaHexPubkeyValidator implements ValidatorConstraintInterface {
  validate(input: string, args: ValidationArguments): boolean {
    const re = /0x[0-9A-Fa-f]{64}/g;
    return input.length === 66 && re.test(input);
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return 'solana spl-token mint should be in hex form (with 0x prefix)';
  }
}

export class TokenRequestDto {
  @Validate(SolanaHexPubkeyValidator)
  @ApiProperty({
    description: 'solana spl-token mint in hex form (with 0x prefix)',
  })
  splTokenMint: string;
}
