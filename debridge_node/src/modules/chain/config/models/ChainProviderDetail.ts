import { AuthType } from '../enums/AuthType';

export interface ChainProviderDetail {
  isValid: boolean;
  isActive: boolean;
  provider: string;
  user?: string;
  password?: string;
  authType: AuthType;
  requireConfirmation?: boolean;
}
