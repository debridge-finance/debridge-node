import { NonceValidationEnum } from '../enums/NonceValidationEnum';
import { ProcessNewTransferResultStatusEnum } from '../enums/ProcessNewTransferResultStatusEnum';

export interface ProcessNewTransferResult {
  blockOrNonceToOverwrite?: number;
  status: ProcessNewTransferResultStatusEnum;
  nonceValidationStatus?: NonceValidationEnum;
  submissionId?: string;
  nonce?: number;
  calculatedSubmissionId?: string;
}
