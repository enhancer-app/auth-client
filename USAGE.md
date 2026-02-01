# Usage Guide

Comprehensive reference for implementing authentication using `@enhancer/auth-client`.

**Prerequisites:** This guide assumes the library is already linked/installed. See [LINKING_PACKAGE.md](./LINKING_PACKAGE.md) for setup instructions.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Core Client API](#core-client-api)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Framework Integrations](#framework-integrations)
- [Complete Examples](#complete-examples)

---

## Quick Start

```typescript
import { EnhancerAuthClient } from '@enhancer/auth-client';

// Initialize client
const client = new EnhancerAuthClient({
  authBackendUrl: 'https://api.enhancer.at',
  authFrontendUrl: 'https://auth.enhancer.at',
  serviceId: 'my-service',
  serviceSecret: 'secret_abc123',
});

// 1. Redirect user to login
const loginUrl = client.getLoginUrl();
res.redirect(loginUrl);

// 2. Exchange authorization code for tokens (in callback handler)
const tokens = await client.exchangeCode(code, state);

// 3. Verify access token
const decoded = await client.verifyToken(tokens.accessToken);
console.log(decoded.sub, decoded.username, decoded.scope);
```

---

## Configuration

### EnhancerAuthConfig

```typescript
interface EnhancerAuthConfig {
  /** Backend API base URL */
  authBackendUrl: string;

  /** Frontend URL for login redirects */
  authFrontendUrl: string;

  /** Your registered service ID */
  serviceId: string;

  /** Your service secret for authentication */
  serviceSecret: string;

  /** HTTP request timeout in milliseconds (default: 10000) */
  timeout?: number;

  /** Public key cache TTL in milliseconds (default: Infinity) */
  publicKeyCacheTTL?: number;

  /** Enable debug logging (default: false) */
  enableDebugLogs?: boolean;
}
```

---

## Core Client API

### Constructor

```typescript
new EnhancerAuthClient(config: EnhancerAuthConfig): EnhancerAuthClient
```

### OAuth Flow Methods

#### getLoginUrl

Returns the login URL to redirect users to the auth service.

```typescript
getLoginUrl(): string
```

**Returns:** `string` - URL like `https://auth.enhancer.at/login?service=my-service`

**Example:**
```typescript
app.get('/login', (req, res) => {
  res.redirect(client.getLoginUrl());
});
```

---

#### exchangeCode

Exchange authorization code for access and refresh tokens.

```typescript
exchangeCode(code: string, state: string): Promise<TokenResponse>
```

**Parameters:**
- `code` - Authorization code from callback query parameter
- `state` - State parameter from callback (CSRF protection)

**Returns:** `Promise<TokenResponse>`

**Example:**
```typescript
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const tokens = await client.exchangeCode(code as string, state as string);
  
  // Store tokens securely
  req.session.accessToken = tokens.accessToken;
  req.session.refreshToken = tokens.refreshToken;
  
  res.redirect('/dashboard');
});
```

---

#### refreshToken

Refresh access token using a refresh token.

```typescript
refreshToken(refreshToken: string): Promise<TokenResponse>
```

**Parameters:**
- `refreshToken` - The refresh token

**Returns:** `Promise<TokenResponse>`

**Example:**
```typescript
try {
  const decoded = await client.verifyToken(accessToken);
} catch (error) {
  if (error instanceof TokenExpiredError) {
    const newTokens = await client.refreshToken(refreshToken);
    // Update stored tokens
    req.session.accessToken = newTokens.accessToken;
    req.session.refreshToken = newTokens.refreshToken;
  }
}
```

---

### JWT Verification Methods

#### verifyToken

Verify and decode a JWT access token.

```typescript
verifyToken(token: string): Promise<DecodedToken>
```

**Parameters:**
- `token` - JWT access token string

**Returns:** `Promise<DecodedToken>`

**Throws:**
- `TokenExpiredError` - Token has expired
- `InvalidTokenError` - Token is invalid or verification failed

**Example:**
```typescript
try {
  const decoded = await client.verifyToken(accessToken);
  console.log({
    accountId: decoded.sub,
    username: decoded.username,
    scopes: decoded.scope,
  });
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // Handle expired token
  } else if (error instanceof InvalidTokenError) {
    // Handle invalid token
  }
}
```

---

#### getPublicKey

Get the RSA public key used for JWT verification (cached).

```typescript
getPublicKey(): Promise<string>
```

**Returns:** `Promise<string>` - Public key in PEM format

**Example:**
```typescript
const publicKey = await client.getPublicKey();
```

---

#### refreshPublicKey

Manually refresh the cached public key (useful if keys are rotated).

```typescript
refreshPublicKey(): Promise<void>
```

**Example:**
```typescript
await client.refreshPublicKey();
```

---

### Service API Methods

#### getConnectedAccounts

Get connected OAuth accounts for a user (requires service authentication).

```typescript
getConnectedAccounts(accountId: string): Promise<ConnectedAccount[]>
```

**Parameters:**
- `accountId` - Account UUID from decoded token (`decoded.sub`)

**Returns:** `Promise<ConnectedAccount[]>`

**Example:**
```typescript
const accounts = await client.getConnectedAccounts(decoded.sub);
accounts.forEach(account => {
  console.log(`${account.provider}: ${account.username}`);
});
```

---

## Type Definitions

### TokenResponse

```typescript
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}
```

### DecodedToken

```typescript
interface DecodedToken {
  sub: string;           // Account UUID
  username: string;
  profilePicture: string;
  iss: string;           // Issuer
  exp: number;           // Expiration timestamp (Unix seconds)
  iat: number;           // Issued at timestamp (Unix seconds)
  aud: string;           // Audience (your service ID)
  scope: string[];       // Granted scopes
}
```

### Provider

```typescript
type Provider = 'TWITCH' | 'KICK';
```

### ConnectedAccount

```typescript
interface ConnectedAccount {
  id: string;
  provider: Provider;
  providerUserId: string;
  username: string;
  profilePictureUrl: string;
  isPrimary: boolean;
  linkedAt: string;      // ISO 8601 timestamp
}
```

---

## Error Handling

All errors extend `AuthError` base class.

### Error Classes

```typescript
// Base error class
class AuthError extends Error {
  statusCode?: number;
  errorCode?: string;
}

// Token has expired (401)
class TokenExpiredError extends AuthError {
  errorCode: 'TOKEN_EXPIRED';
}

// Token is invalid or verification failed (401)
class InvalidTokenError extends AuthError {
  errorCode: 'INVALID_TOKEN';
}

// Rate limit exceeded (429)
class RateLimitError extends AuthError {
  retryAfter?: number;
  errorCode: 'RATE_LIMIT_EXCEEDED';
}

// Service authentication failed (401)
class ServiceAuthError extends AuthError {
  errorCode: 'SERVICE_AUTH_FAILED';
}

// Network/connectivity issue
class NetworkError extends AuthError {
  errorCode: 'NETWORK_ERROR';
}
```

### Usage Pattern

```typescript
import {
  TokenExpiredError,
  InvalidTokenError,
  RateLimitError,
  ServiceAuthError,
  NetworkError,
} from '@enhancer/auth-client';

try {
  const decoded = await client.verifyToken(token);
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // Token expired - refresh or redirect to login
    res.status(401).json({ error: 'Token expired', code: error.errorCode });
  } else if (error instanceof InvalidTokenError) {
    // Invalid token - user needs to re-authenticate
    res.status(401).json({ error: 'Invalid token', code: error.errorCode });
  } else if (error instanceof RateLimitError) {
    // Rate limited - wait before retrying
    res.status(429).json({ 
      error: 'Rate limit exceeded',
      retryAfter: error.retryAfter 
    });
  } else if (error instanceof ServiceAuthError) {
    // Service credentials issue
    console.error('Service authentication failed:', error.message);
  } else if (error instanceof NetworkError) {
    // Connectivity issue
    res.status(503).json({ error: 'Service temporarily unavailable' });
  } else {
    // Unexpected error
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## Framework Integrations

### Express Middleware

Import: `@enhancer/auth-client/middleware/express`

#### requireAuth

Middleware factory for protecting Express routes.

```typescript
function requireAuth(
  client: EnhancerAuthClient,
  options?: RequireAuthOptions
): (req: Request, res: Response, next: NextFunction) => Promise<void>
```

**Options:**
```typescript
interface RequireAuthOptions {
  requiredScopes?: string[];
}
```

**Extended Request Type:**
```typescript
interface AuthenticatedRequest extends Request {
  user: DecodedToken;
}
```

**Example:**
```typescript
import express from 'express';
import { EnhancerAuthClient } from '@enhancer/auth-client';
import { requireAuth, isAuthenticatedRequest } from '@enhancer/auth-client/middleware/express';

const app = express();
const client = new EnhancerAuthClient({ ... });

// Basic protection
app.get('/profile', requireAuth(client), (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  res.json({ user });
});

// With scope validation
app.get('/admin', requireAuth(client, { requiredScopes: ['ADMIN'] }), (req, res) => {
  res.json({ message: 'Admin only' });
});

// Type guard usage
app.get('/data', requireAuth(client), (req, res) => {
  if (isAuthenticatedRequest(req)) {
    const userId = req.user.sub;
    res.json({ userId });
  }
});
```

---

### Fastify Plugin

Import: `@enhancer/auth-client/middleware/fastify`

#### enhancerAuth

Fastify plugin that adds an auth decorator.

```typescript
const enhancerAuth: FastifyPluginAsync<EnhancerAuthPluginOptions>
```

**Options:**
```typescript
interface EnhancerAuthPluginOptions {
  client: EnhancerAuthClient;
}
```

**Decorator Options:**
```typescript
interface EnhancerAuthDecoratorOptions {
  requiredScopes?: string[];
}
```

**Extended Types:**
```typescript
// Request gets user property
declare module 'fastify' {
  interface FastifyRequest {
    user?: DecodedToken;
  }
}
```

**Example:**
```typescript
import Fastify from 'fastify';
import { EnhancerAuthClient } from '@enhancer/auth-client';
import { enhancerAuth } from '@enhancer/auth-client/middleware/fastify';

const fastify = Fastify();
const client = new EnhancerAuthClient({ ... });

// Register plugin
await fastify.register(enhancerAuth, { client });

// Basic protection
fastify.get('/profile', {
  preHandler: fastify.enhancerAuth(),
}, async (request, reply) => {
  return { user: request.user };
});

// With scope validation
fastify.get('/admin', {
  preHandler: fastify.enhancerAuth({ requiredScopes: ['ADMIN'] }),
}, async (request, reply) => {
  return { message: 'Admin access granted' };
});
```

---

### NextAuth/Auth.js Provider

Import: `@enhancer/auth-client/middleware/nextauth-provider`

#### EnhancerProvider

Creates an Auth.js provider for NextAuth v5.

```typescript
function EnhancerProvider(config: EnhancerProviderConfig): ProviderConfig
```

**Config:**
```typescript
interface EnhancerProviderConfig {
  authBackendUrl: string;
  authFrontendUrl: string;
  serviceId: string;
  serviceSecret: string;
}
```

**Example:**
```typescript
// app/api/auth/[...nextauth]/route.ts
import { EnhancerProvider } from '@enhancer/auth-client/middleware/nextauth-provider';
import NextAuth from 'next-auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    EnhancerProvider({
      authBackendUrl: process.env.AUTH_BACKEND_URL!,
      authFrontendUrl: process.env.AUTH_FRONTEND_URL!,
      serviceId: process.env.SERVICE_ID!,
      serviceSecret: process.env.SERVICE_SECRET!,
    }),
  ],
});

export { handlers as GET, handlers as POST };
```

---

## Complete Examples

### Express Full Implementation

```typescript
import express from 'express';
import session from 'express-session';
import { EnhancerAuthClient, TokenExpiredError } from '@enhancer/auth-client';
import { requireAuth } from '@enhancer/auth-client/middleware/express';

const app = express();

// Initialize auth client
const authClient = new EnhancerAuthClient({
  authBackendUrl: process.env.AUTH_BACKEND_URL!,
  authFrontendUrl: process.env.AUTH_FRONTEND_URL!,
  serviceId: process.env.SERVICE_ID!,
  serviceSecret: process.env.SERVICE_SECRET!,
  enableDebugLogs: true,
});

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' },
}));

// Redirect to auth service
app.get('/auth/login', (req, res) => {
  res.redirect(authClient.getLoginUrl());
});

// OAuth callback handler
app.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }
    
    const tokens = await authClient.exchangeCode(code, (state as string) || '');
    
    // Store in session
    req.session.accessToken = tokens.accessToken;
    req.session.refreshToken = tokens.refreshToken;
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Logout
app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

// Protected route
app.get('/api/profile', requireAuth(authClient), (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  res.json({
    accountId: user.sub,
    username: user.username,
    scopes: user.scope,
  });
});

// Admin-only route with scope check
app.get('/api/admin', 
  requireAuth(authClient, { requiredScopes: ['ADMIN'] }), 
  (req, res) => {
    res.json({ message: 'Admin access granted' });
  }
);

// Get connected accounts
app.get('/api/connected-accounts', 
  requireAuth(authClient), 
  async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const accounts = await authClient.getConnectedAccounts(user.sub);
      res.json({ accounts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  }
);

app.listen(3000);
```

---

### Fastify Full Implementation

```typescript
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { EnhancerAuthClient } from '@enhancer/auth-client';
import { enhancerAuth } from '@enhancer/auth-client/middleware/fastify';

const fastify = Fastify({ logger: true });

// Initialize auth client
const authClient = new EnhancerAuthClient({
  authBackendUrl: process.env.AUTH_BACKEND_URL!,
  authFrontendUrl: process.env.AUTH_FRONTEND_URL!,
  serviceId: process.env.SERVICE_ID!,
  serviceSecret: process.env.SERVICE_SECRET!,
});

// Register plugins
await fastify.register(fastifyCookie);
await fastify.register(enhancerAuth, { client: authClient });

// Redirect to auth service
fastify.get('/auth/login', async (request, reply) => {
  return reply.redirect(authClient.getLoginUrl());
});

// OAuth callback handler
fastify.get('/auth/callback', async (request, reply) => {
  const { code, state } = request.query as { code?: string; state?: string };
  
  if (!code) {
    return reply.code(400).send({ error: 'Missing authorization code' });
  }
  
  try {
    const tokens = await authClient.exchangeCode(code, state || '');
    
    // Store in secure cookies
    reply
      .setCookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: tokens.expiresIn,
      })
      .setCookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 7 * 24 * 3600, // 7 days
      })
      .redirect('/dashboard');
  } catch (error) {
    return reply.code(500).send({ error: 'Authentication failed' });
  }
});

// Logout
fastify.get('/auth/logout', async (request, reply) => {
  reply.clearCookie('accessToken').clearCookie('refreshToken');
  return { message: 'Logged out successfully' };
});

// Protected route
fastify.get('/api/profile', {
  preHandler: fastify.enhancerAuth(),
}, async (request, reply) => {
  return {
    accountId: request.user!.sub,
    username: request.user!.username,
    scopes: request.user!.scope,
  };
});

// Admin-only route
fastify.get('/api/admin', {
  preHandler: fastify.enhancerAuth({ requiredScopes: ['ADMIN'] }),
}, async (request, reply) => {
  return { message: 'Admin access granted' };
});

// Get connected accounts
fastify.get('/api/connected-accounts', {
  preHandler: fastify.enhancerAuth(),
}, async (request, reply) => {
  const accounts = await authClient.getConnectedAccounts(request.user!.sub);
  return { accounts };
});

fastify.listen({ port: 3000 });
```

---

### Token Refresh Pattern

```typescript
import { TokenExpiredError } from '@enhancer/auth-client';

async function getValidToken(req, res): Promise<string | null> {
  const accessToken = req.session.accessToken;
  const refreshToken = req.session.refreshToken;
  
  if (!accessToken) {
    return null;
  }
  
  try {
    // Try to verify current token
    await authClient.verifyToken(accessToken);
    return accessToken;
  } catch (error) {
    if (error instanceof TokenExpiredError && refreshToken) {
      try {
        // Token expired, try to refresh
        const newTokens = await authClient.refreshToken(refreshToken);
        
        // Update stored tokens
        req.session.accessToken = newTokens.accessToken;
        req.session.refreshToken = newTokens.refreshToken;
        
        return newTokens.accessToken;
      } catch (refreshError) {
        // Refresh failed, user needs to re-authenticate
        req.session.destroy();
        return null;
      }
    }
    
    // Other verification error
    return null;
  }
}
```

---

### Environment Variables Reference

```bash
# Required
AUTH_BACKEND_URL=https://api.enhancer.at
AUTH_FRONTEND_URL=https://auth.enhancer.at
SERVICE_ID=your-service-id
SERVICE_SECRET=your-service-secret

# Optional
SESSION_SECRET=your-session-secret
NODE_ENV=production
```

---

## API Endpoints Reference

The client communicates with these auth service endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/public-key` | GET | Fetch RSA public key for JWT verification |
| `/auth/exchange-code` | POST | Exchange OAuth code for tokens |
| `/auth/refresh` | POST | Refresh access token |
| `/api/service/accounts/:id/connected-accounts` | GET | Get user's connected OAuth accounts |

---

## Best Practices

1. **Always store tokens securely** - Use httpOnly cookies or secure session storage
2. **Implement token refresh** - Handle `TokenExpiredError` by refreshing before the token expires
3. **Validate scopes** - Use `requiredScopes` middleware option for protected routes
4. **Handle errors gracefully** - Catch and handle all error types appropriately
5. **Use debug logging** - Enable `enableDebugLogs` during development
6. **Cache public keys** - Default caching is infinite; only call `refreshPublicKey()` if you suspect key rotation
