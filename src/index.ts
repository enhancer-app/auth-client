/**
 * @enhancer/auth-client
 *
 * Node.js client library for Enhancer Auth Service
 */

// Main client
export { EnhancerAuthClient } from './client.js';

// Types
export type {
  EnhancerAuthConfig,
  TokenResponse,
  DecodedToken,
  ConnectedAccount,
  Provider,
} from './types/index.js';

// Errors
export {
  AuthError,
  TokenExpiredError,
  InvalidTokenError,
  RateLimitError,
  ServiceAuthError,
  NetworkError,
} from './errors/index.js';

// Configuration validator (optional export)
export { validateConfig } from './config.js';
