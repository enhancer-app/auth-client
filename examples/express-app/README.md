# Express Example

This example demonstrates how to use `@enhancer/auth-client` with Express.js.

## Features

- OAuth 2.0 authentication flow
- Protected routes with JWT verification
- Scope-based authorization
- Session management
- Refresh token handling
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
# Optional - only needed for service-to-service APIs like getConnectedAccounts()
SERVICE_SECRET=your-service-secret
```

3. Run the development server:

```bash
bun run dev
```

## Usage

1. Visit http://localhost:3000
2. Click "Login" to authenticate
3. Access protected routes:
   - `/api/profile` - Your user profile (requires authentication)
   - `/api/admin` - Admin-only (requires ADMIN scope)
   - `/api/connected-accounts` - Your connected accounts

## Key Concepts

### Authentication Middleware

```typescript
import { requireAuth } from '@enhancer/auth-client/middleware/express';

app.get('/protected', requireAuth(authClient), (req, res) => {
  res.json({ user: req.user });
});
```

### Scope-Based Authorization

```typescript
app.get('/admin', requireAuth(authClient, { requiredScopes: ['ADMIN'] }), (req, res) => {
  res.json({ message: 'Admin only' });
});
```

### Token Refresh

Tokens are automatically validated. Handle expiration by refreshing:

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
