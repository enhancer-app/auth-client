import { generateKeyPairSync } from 'crypto';
import * as jose from 'jose';
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
export async function createTestToken(
  payload: Partial<DecodedToken>,
  options: { privateKey?: string } = {}
): Promise<string> {
  const defaultPayload: Omit<DecodedToken, 'exp' | 'iat'> = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    profilePicture: 'https://example.com/avatar.jpg',
    iss: 'enhancer-auth',
    aud: 'test-service',
    scope: ['USER'],
    ...payload,
  };

  const privateKey = await jose.importPKCS8(
    options.privateKey || testKeyPair.privateKey,
    'RS256'
  );

  return new jose.SignJWT(defaultPayload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
}

/**
 * Create an expired test token
 */
export async function createExpiredToken(payload?: Partial<DecodedToken>): Promise<string> {
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

  const privateKey = await jose.importPKCS8(testKeyPair.privateKey, 'RS256');

  return new jose.SignJWT(defaultPayload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKey);
}

/**
 * Create mock token response
 */
export async function createMockTokenResponse(): Promise<TokenResponse> {
  return {
    accessToken: await createTestToken({}),
    refreshToken: 'refresh_token_abc123',
    expiresIn: 3600,
    tokenType: 'Bearer',
  };
}

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
