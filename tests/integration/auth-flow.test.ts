import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { EnhancerAuthClient } from '../../src/client.js';
import { testKeyPair, createTestToken, createExpiredToken } from '../mocks/fixtures.js';
import { TokenExpiredError, InvalidTokenError } from '../../src/errors/index.js';

// Mock server setup using Bun's built-in server
let mockServer: ReturnType<typeof Bun.serve> | null = null;
const PORT = 8765;

beforeAll(() => {
  mockServer = Bun.serve({
    port: PORT,
    async fetch(request) {
      const url = new URL(request.url);

      // GET /auth/public-key
      if (url.pathname === '/auth/public-key' && request.method === 'GET') {
        return Response.json({ publicKey: testKeyPair.publicKey });
      }

      // POST /auth/exchange-code
      if (url.pathname === '/auth/exchange-code' && request.method === 'POST') {
        const body = await request.json();
        const { code, state, serviceId } = body as {
          code: string;
          state: string;
          serviceId: string;
        };

        if (!code || !serviceId) {
          return Response.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const accessToken = createTestToken({ aud: serviceId });

        return Response.json({
          accessToken,
          refreshToken: 'refresh_token_abc123',
          expiresIn: 3600,
          tokenType: 'Bearer',
        });
      }

      // POST /auth/refresh
      if (url.pathname === '/auth/refresh' && request.method === 'POST') {
        const body = await request.json();
        const { refreshToken } = body as { refreshToken: string };

        if (!refreshToken) {
          return Response.json({ message: 'Missing refresh token' }, { status: 400 });
        }

        const accessToken = createTestToken({});
        return Response.json({
          accessToken,
          refreshToken: 'new_refresh_token_xyz789',
          expiresIn: 3600,
          tokenType: 'Bearer',
        });
      }

      // GET /api/service/accounts/:id/connected-accounts
      const accountsMatch = url.pathname.match(
        /^\/api\/service\/accounts\/([^/]+)\/connected-accounts$/
      );
      if (accountsMatch && request.method === 'GET') {
        // Check Basic Auth
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Basic ')) {
          return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }

        return Response.json([
          {
            id: '1',
            provider: 'TWITCH',
            providerUserId: 'twitch_123',
            username: 'twitchuser',
            profilePictureUrl: 'https://twitch.tv/avatar.jpg',
            isPrimary: true,
            linkedAt: '2024-01-01T00:00:00Z',
          },
        ]);
      }

      return Response.json({ message: 'Not found' }, { status: 404 });
    },
  });
});

afterAll(() => {
  if (mockServer) {
    mockServer.stop();
  }
});

describe('EnhancerAuthClient Integration', () => {
  const client = new EnhancerAuthClient({
    authBackendUrl: `http://localhost:${PORT}`,
    authFrontendUrl: 'https://auth.enhancer.at',
    serviceId: 'test-service',
    serviceSecret: 'test-secret',
  });

  describe('OAuth Flow', () => {
    test('getLoginUrl should return correct URL', () => {
      const url = client.getLoginUrl();
      expect(url).toBe('https://auth.enhancer.at/login?service=test-service');
    });

    test('exchangeCode should return tokens', async () => {
      const result = await client.exchangeCode('test-code', 'test-state');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBe('refresh_token_abc123');
      expect(result.expiresIn).toBe(3600);
      expect(result.tokenType).toBe('Bearer');
    });

    test('refreshToken should return new tokens', async () => {
      const result = await client.refreshToken('old_refresh_token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBe('new_refresh_token_xyz789');
      expect(result.expiresIn).toBe(3600);
    });
  });

  describe('JWT Verification', () => {
    test('verifyToken should decode valid token', async () => {
      const token = createTestToken({ aud: 'test-service' });
      const decoded = await client.verifyToken(token);

      expect(decoded.sub).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(decoded.username).toBe('testuser');
      expect(decoded.aud).toBe('test-service');
      expect(decoded.scope).toEqual(['USER']);
    });

    test('verifyToken should throw on expired token', async () => {
      const token = createExpiredToken({ aud: 'test-service' });

      await expect(client.verifyToken(token)).rejects.toThrow(TokenExpiredError);
    });

    test('verifyToken should throw on invalid token', async () => {
      await expect(client.verifyToken('invalid.token.here')).rejects.toThrow(InvalidTokenError);
    });

    test('verifyToken should throw on audience mismatch', async () => {
      const token = createTestToken({ aud: 'wrong-service' });

      await expect(client.verifyToken(token)).rejects.toThrow(InvalidTokenError);
    });

    test('getPublicKey should fetch and cache public key', async () => {
      const publicKey = await client.getPublicKey();
      expect(publicKey).toBe(testKeyPair.publicKey);

      // Second call should use cache
      const publicKey2 = await client.getPublicKey();
      expect(publicKey2).toBe(publicKey);
    });
  });

  describe('Service API', () => {
    test('getConnectedAccounts should return accounts', async () => {
      const accounts = await client.getConnectedAccounts('550e8400-e29b-41d4-a716-446655440000');

      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.provider).toBe('TWITCH');
      expect(accounts[0]?.username).toBe('twitchuser');
    });
  });
});
