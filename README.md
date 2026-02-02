# @enhancer/auth-client

Official Node.js client library for the Enhancer Auth Service. Provides OAuth 2.0 authentication, JWT verification, and middleware integrations for Express, Fastify, and NextAuth.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-orange)](https://bun.sh/)

## Features

- 🔐 **OAuth 2.0 Flow** - Complete authorization code flow implementation
- 🎫 **JWT Verification** - RS256 signature verification with public key caching
- 🔄 **Token Refresh** - Automatic access token renewal
- 🛡️ **Middleware** - Ready-to-use middleware for Express, Fastify, and NextAuth v5
- 🎯 **Scope Validation** - Built-in permission checking
- 📦 **Dual Package** - CommonJS and ESM support
- 🔍 **TypeScript** - Full type definitions included
- ⚡ **Performance** - Minimal dependencies, optimized for speed

## Installation

```bash
# npm
npm install @enhancer/auth-client

# yarn
yarn add @enhancer/auth-client

# pnpm
pnpm add @enhancer/auth-client

# bun
bun add @enhancer/auth-client
```

## Quick Start

```typescript
import { EnhancerAuthClient } from '@enhancer/auth-client';

// Initialize the client
const authClient = new EnhancerAuthClient({
  authBackendUrl: 'http://localhost:8080',
  authFrontendUrl: 'https://auth.enhancer.at',
  serviceId: 'your-service-id',
  // serviceSecret: 'your-service-secret', // Optional - only needed for service-to-service APIs
});

// Redirect user to login
const loginUrl = authClient.getLoginUrl();
console.log('Login at:', loginUrl);

// Exchange authorization code for tokens
const tokens = await authClient.exchangeCode(code, state);

// Verify access token
const decoded = await authClient.verifyToken(tokens.accessToken);
console.log('User:', decoded.username);
```

## Table of Contents

- [Configuration](#configuration)
- [Core API](#core-api)
  - [OAuth Flow](#oauth-flow)
  - [JWT Verification](#jwt-verification)
  - [Service API](#service-api)
- [Middleware](#middleware)
  - [Express](#express-middleware)
  - [Fastify](#fastify-plugin)
  - [NextAuth](#nextauth-provider)
- [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)
- [Examples](#examples)
- [Security Best Practices](#security-best-practices)
- [Contributing](#contributing)
- [License](#license)

## Configuration

### EnhancerAuthConfig

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `authBackendUrl` | `string` | ✅ | - | Backend API base URL (e.g., `http://localhost:8080`) |
| `authFrontendUrl` | `string` | ✅ | - | Frontend base URL for login redirects (e.g., `https://auth.enhancer.at`) |
| `serviceId` | `string` | ✅ | - | Your registered service ID |
| `serviceSecret` | `string` | ❌ | - | Your service secret for authentication. **Required for service-to-service APIs** like `getConnectedAccounts()`. OAuth flows work without it. |
| `timeout` | `number` | ❌ | `10000` | HTTP request timeout in milliseconds |
| `publicKeyCacheTTL` | `number` | ❌ | `Infinity` | Public key cache TTL in milliseconds |
| `enableDebugLogs` | `boolean` | ❌ | `false` | Enable debug logging |

```typescript
const client = new EnhancerAuthClient({
  authBackendUrl: process.env.AUTH_BACKEND_URL!,
  authFrontendUrl: process.env.AUTH_FRONTEND_URL!,
  serviceId: process.env.SERVICE_ID!,
  serviceSecret: process.env.SERVICE_SECRET, // Optional - only needed for service-to-service APIs
  timeout: 5000,
  enableDebugLogs: true,
});
```

## Core API

### OAuth Flow

#### `getLoginUrl(): string`

Returns the login URL to redirect users to for authentication.

```typescript
app.get('/login', (req, res) => {
  const loginUrl = authClient.getLoginUrl();
  res.redirect(loginUrl);
});
```

#### `exchangeCode(code: string, state: string): Promise<TokenResponse>`

Exchange authorization code for access and refresh tokens.

```typescript
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const tokens = await authClient.exchangeCode(code, state);
  
  // Store tokens securely
  req.session.accessToken = tokens.accessToken;
  req.session.refreshToken = tokens.refreshToken;
  
  res.redirect('/dashboard');
});
```

**Response:**
```typescript
interface TokenResponse {
  accessToken: string;      // JWT access token
  refreshToken: string;     // Refresh token
  expiresIn: number;        // Token lifetime in seconds
  tokenType: string;        // Always "Bearer"
}
```

#### `refreshToken(refreshToken: string): Promise<TokenResponse>`

Refresh an expired access token.

```typescript
try {
  const decoded = await authClient.verifyToken(accessToken);
} catch (error) {
  if (error instanceof TokenExpiredError) {
    const newTokens = await authClient.refreshToken(refreshToken);
    // Update stored tokens
  }
}
```

### JWT Verification

#### `verifyToken(token: string): Promise<DecodedToken>`

Verify and decode a JWT access token.

```typescript
const decoded = await authClient.verifyToken(accessToken);

console.log({
  accountId: decoded.sub,
  username: decoded.username,
  scopes: decoded.scope,
  expiresAt: new Date(decoded.exp * 1000),
});
```

**Response:**
```typescript
interface DecodedToken {
  sub: string;              // Account UUID
  username: string;         // Username
  profilePicture: string;   // Profile picture URL
  iss: string;              // Issuer
  exp: number;              // Expiration timestamp
  iat: number;              // Issued at timestamp
  aud: string;              // Audience (your service ID)
  scope: string[];          // Granted scopes
}
```

#### `getPublicKey(): Promise<string>`

Get the RSA public key used for JWT verification (cached).

```typescript
const publicKey = await authClient.getPublicKey();
```

#### `refreshPublicKey(): Promise<void>`

Manually refresh the cached public key.

```typescript
await authClient.refreshPublicKey();
```

### Service API

#### `getConnectedAccounts(accountId: string): Promise<ConnectedAccount[]>`

Get connected OAuth accounts for a user.

```typescript
const accounts = await authClient.getConnectedAccounts(accountId);

accounts.forEach(account => {
  console.log(`${account.provider}: ${account.username}`);
});
```

**Response:**
```typescript
interface ConnectedAccount {
  id: string;
  provider: 'TWITCH' | 'KICK';
  providerUserId: string;
  username: string;
  profilePictureUrl: string;
  isPrimary: boolean;
  linkedAt: string;         // ISO 8601 timestamp
}
```

## Middleware

### Express Middleware

```typescript
import express from 'express';
import { EnhancerAuthClient } from '@enhancer/auth-client';
import { requireAuth } from '@enhancer/auth-client/middleware/express';

const app = express();
const authClient = new EnhancerAuthClient({ /* config */ });

// Basic usage
app.get('/protected', requireAuth(authClient), (req, res) => {
  res.json({ user: req.user });
});

// With scope validation
app.get('/admin', requireAuth(authClient, { requiredScopes: ['ADMIN'] }), (req, res) => {
  res.json({ message: 'Admin only' });
});
```

**TypeScript:**
```typescript
import type { AuthenticatedRequest } from '@enhancer/auth-client/middleware/express';

app.get('/profile', requireAuth(authClient), (req: AuthenticatedRequest, res) => {
  console.log(req.user.username); // Typed!
});
```

### Fastify Plugin

```typescript
import Fastify from 'fastify';
import { EnhancerAuthClient } from '@enhancer/auth-client';
import { enhancerAuth } from '@enhancer/auth-client/middleware/fastify';

const fastify = Fastify();
const authClient = new EnhancerAuthClient({ /* config */ });

// Register plugin
await fastify.register(enhancerAuth, { client: authClient });

// Use decorator
fastify.get('/protected', {
  preHandler: fastify.enhancerAuth()
}, async (request, reply) => {
  return { user: request.user };
});

// With scope validation
fastify.get('/admin', {
  preHandler: fastify.enhancerAuth({ requiredScopes: ['ADMIN'] })
}, async (request, reply) => {
  return { message: 'Admin only' };
});
```

### NextAuth Provider

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { EnhancerProvider } from '@enhancer/auth-client/middleware/nextauth-provider';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    EnhancerProvider({
      authBackendUrl: process.env.AUTH_BACKEND_URL!,
      authFrontendUrl: process.env.AUTH_FRONTEND_URL!,
      serviceId: process.env.SERVICE_ID!,
  serviceSecret: process.env.SERVICE_SECRET, // Optional - only needed for service-to-service APIs
    }),
  ],
});

export { handlers as GET, handlers as POST };
```

## Error Handling

The library provides custom error classes for different scenarios:

```typescript
import {
  AuthError,
  TokenExpiredError,
  InvalidTokenError,
  RateLimitError,
  ServiceAuthError,
  NetworkError,
} from '@enhancer/auth-client';

try {
  const decoded = await authClient.verifyToken(token);
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // Token has expired - refresh it
    const newTokens = await authClient.refreshToken(refreshToken);
  } else if (error instanceof InvalidTokenError) {
    // Token is invalid - re-authenticate
    res.redirect('/login');
  } else if (error instanceof RateLimitError) {
    // Rate limit exceeded
    const retryAfter = error.retryAfter; // Seconds to wait
    res.status(429).json({ retryAfter });
  } else if (error instanceof ServiceAuthError) {
    // Service credentials are invalid
    console.error('Invalid service credentials');
  } else if (error instanceof NetworkError) {
    // Network connectivity issue
    console.error('Network error:', error.message);
  }
}
```

### Error Properties

All errors extend `AuthError` and include:

- `message: string` - Error description
- `statusCode?: number` - HTTP status code (if applicable)
- `errorCode?: string` - Application-specific error code

## TypeScript Support

This package includes full TypeScript type definitions. All types are exported for your convenience:

```typescript
import type {
  EnhancerAuthConfig,
  TokenResponse,
  DecodedToken,
  ConnectedAccount,
  Provider,
} from '@enhancer/auth-client';
```

## Examples

See the [`examples/`](./examples) directory for complete working applications:

- **[Express](./examples/express-app)** - Session-based authentication
- **[Fastify](./examples/fastify-app)** - Cookie-based authentication with plugin
- **[Next.js](./examples/nextjs-app)** - NextAuth v5 integration

## Security Best Practices

### Token Storage

✅ **DO:**
- Store tokens in httpOnly cookies
- Use secure flag in production (HTTPS)
- Set appropriate maxAge/expires
- Use SameSite=Strict or Lax

❌ **DON'T:**
- Store tokens in localStorage
- Store tokens in sessionStorage
- Expose tokens in client-side JavaScript
- Log tokens to console

### HTTPS in Production

```typescript
const client = new EnhancerAuthClient({
  authBackendUrl: 'https://api.enhancer.at',    // HTTPS!
  authFrontendUrl: 'https://auth.enhancer.at',  // HTTPS!
  serviceId: process.env.SERVICE_ID!,
  serviceSecret: process.env.SERVICE_SECRET, // Optional - only needed for service-to-service APIs
});
```

### Token Expiration

Always check token expiration and refresh proactively:

```typescript
const decoded = await authClient.verifyToken(token);
const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

if (expiresIn < 300) { // Less than 5 minutes
  const newTokens = await authClient.refreshToken(refreshToken);
  // Update tokens
}
```

### Refresh Token Rotation

The auth service automatically rotates refresh tokens on each use. Always store the new refresh token:

```typescript
const tokens = await authClient.refreshToken(oldRefreshToken);
// tokens.refreshToken is a NEW token - replace the old one!
```

### Secret Management

Never commit secrets to version control:

```bash
# .env
SERVICE_SECRET=secret_abc123
```

```typescript
// Use environment variables
const client = new EnhancerAuthClient({
  serviceSecret: process.env.SERVICE_SECRET, // Optional - only needed for service-to-service APIs
  // ...
});
```

## API Reference

Full API documentation is available in the [source code JSDoc comments](./src).

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`bun test`)
5. Run linter (`bun run lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

MIT © Enhancer

---

**Need help?** Open an issue on [GitHub](https://github.com/enhancer/auth-client/issues)
