# Fastify Example

This example demonstrates how to use `@enhancer/auth-client` with Fastify.

## Features

- OAuth 2.0 authentication flow
- Protected routes with decorator pattern
- Scope-based authorization
- Cookie-based token storage
- Connected accounts API

## Setup

1. Install dependencies:

```bash
bun install
```

2. Create a `.env` file:

```env
AUTH_BACKEND_URL=http://localhost:8080
AUTH_FRONTEND_URL=https://auth.enhancer.at
SERVICE_ID=your-service-id
SERVICE_SECRET=your-service-secret
```

3. Run the development server:

```bash
bun run dev
```

## Usage

1. Visit http://localhost:3001
2. Click "Login" to authenticate
3. Access protected routes:
   - `/api/profile` - Your user profile
   - `/api/admin` - Admin-only route
   - `/api/connected-accounts` - Connected accounts

## Key Concepts

### Register the Plugin

```typescript
import { enhancerAuth } from '@enhancer/auth-client/middleware/fastify';

await fastify.register(enhancerAuth, { client: authClient });
```

### Protect Routes with Decorator

```typescript
fastify.get(
  '/protected',
  {
    preHandler: fastify.enhancerAuth(),
  },
  async (request, reply) => {
    return { user: request.user };
  }
);
```

### Scope-Based Authorization

```typescript
fastify.get(
  '/admin',
  {
    preHandler: fastify.enhancerAuth({ requiredScopes: ['ADMIN'] }),
  },
  async (request, reply) => {
    return { message: 'Admin only' };
  }
);
```
