# Usage Changelog

This document tracks API and behavior changes that affect how you use @enhancer/auth-client.

## [1.1.0] - 2026-02-02

### serviceSecret is now OPTIONAL

**What changed:**
- `serviceSecret` is no longer required in `EnhancerAuthConfig`
- OAuth authentication flows work without providing `serviceSecret`
- Only service-to-service APIs require it

**What works WITHOUT serviceSecret:**
- `getLoginUrl()` - Redirect users to login
- `exchangeCode(code, state)` - Exchange authorization code for tokens
- `refreshToken(refreshToken)` - Refresh access tokens
- `verifyToken(token)` - Verify and decode JWT tokens
- `getPublicKey()` / `refreshPublicKey()` - Public key operations

**What REQUIRES serviceSecret:**
- `getConnectedAccounts(accountId)` - Will throw error if called without serviceSecret configured

**Migration Guide:**
- **No changes required** for existing code - fully backward compatible
- **If you want to remove serviceSecret:** Only do so if you're not using `getConnectedAccounts()`
- **If using getConnectedAccounts():** You MUST provide serviceSecret, otherwise you'll get a runtime error

**Error you'll see without serviceSecret:**
```
Error: serviceSecret is required to call getConnectedAccounts(). 
Please provide serviceSecret in your EnhancerAuthConfig when initializing the client.
```

**Example - Without serviceSecret (OAuth only):**
```typescript
const client = new EnhancerAuthClient({
  authBackendUrl: 'http://localhost:8080',
  authFrontendUrl: 'https://auth.enhancer.at',
  serviceId: 'my-service',
  // serviceSecret not needed for OAuth flows
});

// All these work:
const loginUrl = client.getLoginUrl();
const tokens = await client.exchangeCode(code, state);
const decoded = await client.verifyToken(tokens.accessToken);
```

**Example - With serviceSecret (Service-to-service APIs):**
```typescript
const client = new EnhancerAuthClient({
  authBackendUrl: 'http://localhost:8080',
  authFrontendUrl: 'https://auth.enhancer.at',
  serviceId: 'my-service',
  serviceSecret: 'secret_abc123', // Required for service-to-service calls
});

// OAuth flows work
const tokens = await client.exchangeCode(code, state);

// Service-to-service API also works
const accounts = await client.getConnectedAccounts(decoded.sub);
```

**When to provide serviceSecret:**
- ✅ **Required:** When using `getConnectedAccounts()` or other service-to-service APIs
- ✅ **Optional:** When only using OAuth authentication flows
- ✅ **Recommendation:** If you might need service-to-service APIs later, include it from the start

**No code changes needed** - existing implementations with serviceSecret continue to work unchanged.
