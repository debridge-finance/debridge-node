import { NonceValidationEnum } from '../enums/NonceValidationEnum';
import { ProcessNewTransferResultStatusEnum } from '../enums/ProcessNewTransferResultStatusEnum';

export interface ProcessNewTransferResult {
  blockOrTransactionToOverwrite?: number | string;
  status: ProcessNewTransferResultStatusEnum;
  nonceValidationStatus?: NonceValidationEnum;
  submissionId?: string;
  nonce?: number;
}
