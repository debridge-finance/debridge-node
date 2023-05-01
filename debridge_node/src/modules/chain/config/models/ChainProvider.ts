/**
 * Chain provider
 */
import { ChainProviderDetail } from './ChainProviderDetail';
import { AuthType } from '../enums/AuthType';

export class ChainProvider {
  private readonly providers = new Map<string, ChainProviderDetail>();
  constructor(private readonly providerList: ChainProviderDetail[], private readonly chainId: number) {
    for (const provider of providerList) {
      this.providers.set(provider.provider, provider);
    }
  }

  /**
   * Get not failed provider
   */
  getNotFailedProviders(): string[] {
    const providers = [];
    for (const provider of this.providers.keys()) {
      if (this.providers.get(provider).isActive && this.providers.get(provider).isValid) {
        providers.push(provider);
      }
    }
    return providers;
  }

  /**
   * Get auth of chain
   * @param {string} provider
   */
  getChainAuth(provider: string) {
    const detail = this.providers.get(provider);
    if (detail.authType === AuthType.BASIC) {
      return [
        {
          name: 'Authorization',
          value: `Basic ${Buffer.from(`${detail.user}:${detail.password}`).toString('base64')}`,
        },
      ];
    }
    return undefined;
  }

  /**
   * Get failed provider
   */
  getFailedProviders(): string[] {
    const providers = [];
    for (const provider of this.providers.keys()) {
      if (!this.providers.get(provider).isActive) {
        providers.push(provider);
      }
    }
    return providers;
  }

  /**
   * Get all prochviders
   */
  getAllProviders(): string[] {
    const providers = [];
    for (const provider of this.providers.keys()) {
      providers.push(provider);
    }
    return providers;
  }

  /**
   * Set status to provider
   * @param {string} provider
   * @param {boolean} status
   */
  setProviderStatus(provider: string, status: boolean) {
    const details = this.providers.get(provider);
    details.isActive = status;
    this.providers.set(provider, details);
  }

  /**
   * Get status to provider
   * @param {string} provider
   */
  getProviderStatus(provider: string): boolean {
    const details = this.providers.get(provider);
    return details.isActive;
  }

  /**
   * Get require to provider
   * @param {string} provider
   */
  getRequireConfirmation(provider: string): boolean {
    const details = this.providers.get(provider);
    return details.requireConfirmation;
  }

  /**
   * Set validation status to provider
   * @param {string} provider
   * @param {boolean} status
   */
  setProviderValidationStatus(provider: string, status: boolean) {
    const details = this.providers.get(provider);
    details.isValid = status;
    this.providers.set(provider, details);
  }

  /**
   * Get validation status to provider
   * @param {string} provider
   */
  getProviderValidationStatus(provider: string): boolean {
    const details = this.providers.get(provider);
    return details.isValid;
  }

  /**
   * Get counts of providers
   */
  size(): number {
    return this.providers.size;
  }

  /**
   * Get id of chain
   */
  getChainId(): number {
    return this.chainId;
  }
}
