import { ChainProviderDetail } from '../ChainProviderDetail';
import { AuthType } from '../../enums/AuthType';
import { ChainProvider } from '../ChainProvider';

describe('ChainProvider', () => {
  const providerList: ChainProviderDetail[] = [
    {
      provider: 'https://provider1.com',
      isActive: true,
      isValid: true,
      authType: AuthType.NONE,
      user: '',
      password: '',
    },
    {
      provider: 'https://provider2.com',
      isActive: false,
      isValid: true,
      authType: AuthType.BASIC,
      user: 'user2',
      password: 'password2',
    },
    {
      provider: 'https://provider3.com',
      isActive: true,
      isValid: false,
      authType: AuthType.NONE,
      user: '',
      password: '',
    },
  ];
  const chainId = 1;
  let chainProvider: ChainProvider;

  beforeEach(() => {
    chainProvider = new ChainProvider(providerList, chainId);
  });

  describe('getNotFailedProviders', () => {
    it('returns only active and valid providers', () => {
      expect(chainProvider.getNotFailedProviders()).toEqual(['https://provider1.com']);
    });
  });

  describe('getChainAuth', () => {
    it('returns auth header for BASIC auth type', () => {
      const expectedAuthHeader = [
        {
          name: 'Authorization',
          value: 'Basic dXNlcjI6cGFzc3dvcmQy',
        },
      ];
      expect(chainProvider.getChainAuth('https://provider2.com')).toEqual(expectedAuthHeader);
    });

    it('returns undefined for NONE auth type', () => {
      expect(chainProvider.getChainAuth('https://provider1.com')).toBeUndefined();
    });
  });

  describe('getFailedProviders', () => {
    it('returns only inactive providers', () => {
      expect(chainProvider.getFailedProviders()).toEqual(['https://provider2.com']);
    });
  });

  describe('getAllProviders', () => {
    it('returns all provider URLs', () => {
      expect(chainProvider.getAllProviders()).toEqual(['https://provider1.com', 'https://provider2.com', 'https://provider3.com']);
    });
  });

  describe('setProviderStatus', () => {
    it('updates the status of a provider', () => {
      chainProvider.setProviderStatus('https://provider1.com', false);
      expect(chainProvider.getProviderStatus('https://provider1.com')).toBe(false);
    });
  });

  describe('setProviderValidationStatus', () => {
    it('updates the validation status of a provider', () => {
      chainProvider.setProviderValidationStatus('https://provider1.com', false);
      expect(chainProvider.getProviderValidationStatus('https://provider1.com')).toBe(false);
    });
  });

  describe('size', () => {
    it('returns the number of providers', () => {
      expect(chainProvider.size()).toBe(3);
    });
  });

  describe('getChainId', () => {
    it('returns the chain ID', () => {
      expect(chainProvider.getChainId()).toBe(chainId);
    });
  });
});
