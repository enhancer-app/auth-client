import { describe, test, expect } from 'bun:test';
import {
  AuthError,
  TokenExpiredError,
  InvalidTokenError,
  RateLimitError,
  ServiceAuthError,
  NetworkError,
} from '../../src/errors/index.js';

describe('Error Classes', () => {
  describe('AuthError', () => {
    test('should create error with message', () => {
      const error = new AuthError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AuthError');
      expect(error.statusCode).toBeUndefined();
      expect(error.errorCode).toBeUndefined();
    });

    test('should create error with status code and error code', () => {
      const error = new AuthError('Test error', 400, 'BAD_REQUEST');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('BAD_REQUEST');
    });

    test('should be instance of Error', () => {
      const error = new AuthError('Test');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AuthError).toBe(true);
    });
  });

  describe('TokenExpiredError', () => {
    test('should have default message and status code 401', () => {
      const error = new TokenExpiredError();
      expect(error.message).toBe('Token has expired');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('TOKEN_EXPIRED');
      expect(error.name).toBe('TokenExpiredError');
    });

    test('should accept custom message', () => {
      const error = new TokenExpiredError('Custom message');
      expect(error.message).toBe('Custom message');
    });
  });

  describe('InvalidTokenError', () => {
    test('should have default message and status code 401', () => {
      const error = new InvalidTokenError();
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('INVALID_TOKEN');
      expect(error.name).toBe('InvalidTokenError');
    });
  });

  describe('RateLimitError', () => {
    test('should have default message and status code 429', () => {
      const error = new RateLimitError();
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.errorCode).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.name).toBe('RateLimitError');
    });

    test('should store retryAfter value', () => {
      const error = new RateLimitError('Too many requests', 60);
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('ServiceAuthError', () => {
    test('should have default message and status code 401', () => {
      const error = new ServiceAuthError();
      expect(error.message).toBe('Service authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('SERVICE_AUTH_FAILED');
      expect(error.name).toBe('ServiceAuthError');
    });
  });

  describe('NetworkError', () => {
    test('should have default message and no status code', () => {
      const error = new NetworkError();
      expect(error.message).toBe('Network error occurred');
      expect(error.statusCode).toBeUndefined();
      expect(error.errorCode).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
    });
  });
});
