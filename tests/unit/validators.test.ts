import { describe, test, expect } from 'bun:test';
import { isValidUUID, isValidJWTFormat, sanitizeUrl } from '../../src/utils/validators.js';

describe('Validators', () => {
  describe('isValidUUID', () => {
    test('should validate correct UUID v4', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      expect(isValidUUID(validUUID)).toBe(true);
    });

    test('should validate case-insensitive UUID', () => {
      const uppercaseUUID = '550E8400-E29B-41D4-A716-446655440000';
      expect(isValidUUID(uppercaseUUID)).toBe(true);
    });

    test('should reject invalid UUID format', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });

    test('should reject UUID v1/v3/v5', () => {
      const uuidV1 = '550e8400-e29b-11d4-a716-446655440000';
      expect(isValidUUID(uuidV1)).toBe(false);
    });
  });

  describe('isValidJWTFormat', () => {
    test('should validate correct JWT format', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(isValidJWTFormat(validJWT)).toBe(true);
    });

    test('should reject JWT with missing parts', () => {
      expect(isValidJWTFormat('header.payload')).toBe(false);
      expect(isValidJWTFormat('header')).toBe(false);
      expect(isValidJWTFormat('')).toBe(false);
    });

    test('should reject JWT with empty parts', () => {
      expect(isValidJWTFormat('..')).toBe(false);
      expect(isValidJWTFormat('.payload.signature')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    test('should remove trailing slash', () => {
      expect(sanitizeUrl('https://example.com/')).toBe('https://example.com');
    });

    test('should remove multiple trailing slashes', () => {
      expect(sanitizeUrl('https://example.com///')).toBe('https://example.com');
    });

    test('should not modify URL without trailing slash', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    test('should preserve path', () => {
      expect(sanitizeUrl('https://example.com/path/')).toBe('https://example.com/path');
    });
  });
});
