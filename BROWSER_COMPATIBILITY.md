# Browser Compatibility

This document explains the browser compatibility changes made to @enhancer/auth-client.

## Problem

The library could not run in browsers because it used Node.js-specific modules:
- `Buffer` for base64 encoding (Basic Auth headers)
- `jsonwebtoken` library which depends on Node.js crypto, stream, http, and https modules

## Solution

### 1. Replaced `jsonwebtoken` with `jose`

**Before:**
```typescript
import jwt from 'jsonwebtoken';

const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  audience: this.serviceId,
});
```

**After:**
```typescript
import * as jose from 'jose';

const cryptoKey = await jose.importSPKI(publicKey, 'RS256');
const { payload } = await jose.jwtVerify(token, cryptoKey, {
  algorithms: ['RS256'],
  audience: this.serviceId,
});
```

**Benefits:**
- `jose` uses Web Crypto API, which works in both browsers and Node.js
- Modern, actively maintained library
- Better TypeScript support

### 2. Created browser-compatible base64 utility

**Created: `src/utils/base64.ts`**
```typescript
export function encodeBase64(str: string): string {
  // Check if we're in a browser environment
  if (typeof globalThis !== 'undefined' && 'btoa' in globalThis) {
    return globalThis.btoa(str);
  }

  // Node.js environment - check if Buffer is available
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64');
  }

  throw new Error('No base64 encoding function available');
}
```

**Usage:**
- Browsers: Uses native `btoa` function
- Node.js: Uses `Buffer` API
- Runtime detection ensures compatibility

### 3. Updated build system

**Created: `build.mjs`**
- Uses esbuild instead of Bun
- Generates three outputs:
  1. ESM for Node.js (`dist/index.mjs`)
  2. CommonJS for Node.js (`dist/index.js`)
  3. Bundled ESM for browsers (`dist/browser/index.js`)

**Package.json exports:**
```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "browser": "./dist/browser/index.js",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }
}
```

## Browser Usage

### Installation
```bash
npm install @enhancer/auth-client
```

### Example
```typescript
import { EnhancerAuthClient } from '@enhancer/auth-client';

const authClient = new EnhancerAuthClient({
  authBackendUrl: 'https://api.enhancer.at',
  authFrontendUrl: 'https://auth.enhancer.at',
  serviceId: 'your-service-id',
});

// Verify JWT tokens in the browser
const decoded = await authClient.verifyToken(accessToken);
console.log('User:', decoded.username);
```

## Compatibility

### ✅ Works in Browsers
- JWT verification (using Web Crypto API)
- Token exchange
- Token refresh
- Base64 encoding/decoding

### ⚠️ Server-only
- Middleware (Express, Fastify, NextAuth) - designed for server-side use
- Service-to-service APIs (require serviceSecret)

## Testing

Browser compatibility is verified by:
1. TypeScript compilation
2. Linter (Biome)
3. Browser compatibility test script (`test-browser-compat.mjs`)
4. CodeQL security scan

All tests pass ✅

## Dependencies

### Before
- `jsonwebtoken` (Node.js only)
- `@types/jsonwebtoken`

### After
- `jose` (Universal: Node.js + Browser)

## Build Size

- Node.js builds: ~2KB (unbundled)
- Browser build: ~180KB (bundled with jose)

## Breaking Changes

**None.** The API remains the same. This is fully backward compatible with existing Node.js usage.
