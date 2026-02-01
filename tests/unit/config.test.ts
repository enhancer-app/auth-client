import { describe, test, expect } from 'bun:test';
import { validateConfig } from '../../src/config.js';
import type { EnhancerAuthConfig } from '../../src/types/config.js';

describe('Config Validation', () => {
  const validConfig: EnhancerAuthConfig = {
    authBackendUrl: 'http://localhost:8080',
    authFrontendUrl: 'https://auth.enhancer.at',
    serviceId: 'test-service',
    serviceSecret: 'secret_abc123',
  };

  describe('Valid Configuration', () => {
    test('should accept valid config with all required fields', () => {
      const result = validateConfig(validConfig);
      expect(result.authBackendUrl).toBe('http://localhost:8080');
      expect(result.authFrontendUrl).toBe('https://auth.enhancer.at');
      expect(result.serviceId).toBe('test-service');
      expect(result.serviceSecret).toBe('secret_abc123');
    });

    test('should apply default values', () => {
      const result = validateConfig(validConfig);
      expect(result.timeout).toBe(10000);
      expect(result.publicKeyCacheTTL).toBe(Number.POSITIVE_INFINITY);
      expect(result.enableDebugLogs).toBe(false);
    });

    test('should accept custom optional values', () => {
      const result = validateConfig({
        ...validConfig,
        timeout: 5000,
        publicKeyCacheTTL: 3600000,
        enableDebugLogs: true,
      });
      expect(result.timeout).toBe(5000);
      expect(result.publicKeyCacheTTL).toBe(3600000);
      expect(result.enableDebugLogs).toBe(true);
    });
  });

  describe('Invalid Configuration', () => {
    test('should throw on missing authBackendUrl', () => {
      const config = { ...validConfig };
      delete (config as Partial<EnhancerAuthConfig>).authBackendUrl;

      expect(() => validateConfig(config as EnhancerAuthConfig)).toThrow(
        /authBackendUrl.*required/i
      );
    });

    test('should throw on invalid authBackendUrl', () => {
      expect(() =>
        validateConfig({ ...validConfig, authBackendUrl: 'not-a-url' })
      ).toThrow();
    });

    test('should throw on non-http authBackendUrl', () => {
      expect(() =>
        validateConfig({ ...validConfig, authBackendUrl: 'ftp://example.com' })
      ).toThrow();
    });

    test('should throw on missing authFrontendUrl', () => {
      const config = { ...validConfig };
      delete (config as Partial<EnhancerAuthConfig>).authFrontendUrl;

      expect(() => validateConfig(config as EnhancerAuthConfig)).toThrow(
        /authFrontendUrl.*required/i
      );
    });

    test('should throw on empty serviceId', () => {
      expect(() => validateConfig({ ...validConfig, serviceId: '' })).toThrow(/serviceId/i);
    });

    test('should throw on empty serviceSecret', () => {
      expect(() => validateConfig({ ...validConfig, serviceSecret: '' })).toThrow(
        /serviceSecret/i
      );
    });
  });
});
