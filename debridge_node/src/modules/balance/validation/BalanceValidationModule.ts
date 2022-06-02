import { Module } from '@nestjs/common';
import { ValidationBalanceService } from './services/ValidationBalanceService';

@Module({
  providers: [ValidationBalanceService],
  exports: [ValidationBalanceService],
})
export class BalanceValidationModule {}
