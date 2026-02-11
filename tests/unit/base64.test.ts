import { describe, test, expect } from 'bun:test';
import { encodeBase64, decodeBase64 } from '../../src/utils/base64.js';

describe('Base64 Utilities', () => {
  describe('encodeBase64', () => {
    test('should encode string to base64', () => {
      const input = 'hello:world';
      const encoded = encodeBase64(input);
      expect(encoded).toBe('aGVsbG86d29ybGQ=');
    });

    test('should encode service credentials', () => {
      const input = 'my-service:secret_abc123';
      const encoded = encodeBase64(input);
      expect(encoded).toBe('bXktc2VydmljZTpzZWNyZXRfYWJjMTIz');
    });

    test('should handle empty string', () => {
      const input = '';
      const encoded = encodeBase64(input);
      expect(encoded).toBe('');
    });
  });

  describe('decodeBase64', () => {
    test('should decode base64 to string', () => {
      const encoded = 'aGVsbG86d29ybGQ=';
      const decoded = decodeBase64(encoded);
      expect(decoded).toBe('hello:world');
    });

    test('should decode service credentials', () => {
      const encoded = 'bXktc2VydmljZTpzZWNyZXRfYWJjMTIz';
      const decoded = decodeBase64(encoded);
      expect(decoded).toBe('my-service:secret_abc123');
    });

    test('should handle empty string', () => {
      const encoded = '';
      const decoded = decodeBase64(encoded);
      expect(decoded).toBe('');
    });
  });

  describe('round-trip encoding', () => {
    test('should encode and decode correctly', () => {
      const original = 'test:password123';
      const encoded = encodeBase64(original);
      const decoded = decodeBase64(encoded);
      expect(decoded).toBe(original);
    });
  });
});
