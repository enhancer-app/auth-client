import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import type { DecodedToken, TokenResponse, ConnectedAccount } from '../../src/types/index.js';

/**
 * Generate RSA key pair for testing
 */
export function generateTestKeyPair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
}

// Generate keys once for all tests
export const testKeyPair = generateTestKeyPair();

/**
 * Create a test JWT token
 */
export function createTestToken(
  payload: Partial<DecodedToken>,
  options: { privateKey?: string } = {}
): string {
  const defaultPayload: Omit<DecodedToken, 'exp' | 'iat'> = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    profilePicture: 'https://example.com/avatar.jpg',
    iss: 'enhancer-auth',
    aud: 'test-service',
    scope: ['USER'],
    ...payload,
  };

  return jwt.sign(defaultPayload, options.privateKey || testKeyPair.privateKey, {
    algorithm: 'RS256',
    expiresIn: '1h',
  });
}

/**
 * Create an expired test token
 */
export function createExpiredToken(payload?: Partial<DecodedToken>): string {
  const defaultPayload: DecodedToken = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    profilePicture: 'https://example.com/avatar.jpg',
    iss: 'enhancer-auth',
    exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    iat: Math.floor(Date.now() / 1000) - 7200, // Issued 2 hours ago
    aud: 'test-service',
    scope: ['USER'],
    ...payload,
  };

  return jwt.sign(defaultPayload, testKeyPair.privateKey, {
    algorithm: 'RS256',
    noTimestamp: true, // Don't override our custom exp/iat
  });
}

/**
 * Mock token response
 */
export const mockTokenResponse: TokenResponse = {
  accessToken: createTestToken({}),
  refreshToken: 'refresh_token_abc123',
  expiresIn: 3600,
  tokenType: 'Bearer',
};

/**
 * Mock connected accounts
 */
export const mockConnectedAccounts: ConnectedAccount[] = [
  {
    id: '1',
    provider: 'TWITCH',
    providerUserId: 'twitch_123',
    username: 'twitchuser',
    profilePictureUrl: 'https://twitch.tv/avatar.jpg',
    isPrimary: true,
    linkedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    provider: 'KICK',
    providerUserId: 'kick_456',
    username: 'kickuser',
    profilePictureUrl: 'https://kick.com/avatar.jpg',
    isPrimary: false,
    linkedAt: '2024-01-02T00:00:00Z',
  },
];
