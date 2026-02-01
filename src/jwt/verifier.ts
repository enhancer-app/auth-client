import jwt from 'jsonwebtoken';
import { InvalidTokenError, TokenExpiredError } from '../errors/index.js';
import type { DecodedToken } from '../types/tokens.js';
import { isValidJWTFormat } from '../utils/validators.js';
import type { PublicKeyCache } from './public-key-cache.js';

/**
 * Handles JWT token verification
 */
export class JwtVerifier {
  private readonly publicKeyCache: PublicKeyCache;
  private readonly serviceId: string;
  private readonly enableDebugLogs: boolean;

  constructor(publicKeyCache: PublicKeyCache, serviceId: string, enableDebugLogs = false) {
    this.publicKeyCache = publicKeyCache;
    this.serviceId = serviceId;
    this.enableDebugLogs = enableDebugLogs;
  }

  /**
   * Verifies and decodes a JWT access token
   *
   * @param token - JWT token to verify
   * @returns Decoded token payload
   * @throws {InvalidTokenError} If token format is invalid or verification fails
   * @throws {TokenExpiredError} If token has expired
   *
   * @example
   * ```typescript
   * const decoded = await verifier.verify(accessToken);
   * console.log(decoded.sub); // Account UUID
   * ```
   */
  async verify(token: string): Promise<DecodedToken> {
    // Validate token format
    if (!token || typeof token !== 'string') {
      throw new InvalidTokenError('Token must be a non-empty string');
    }

    if (!isValidJWTFormat(token)) {
      throw new InvalidTokenError('Invalid JWT format');
    }

    try {
      // Get the public key
      const publicKey = await this.publicKeyCache.getPublicKey();

      if (this.enableDebugLogs) {
        console.log('[JwtVerifier] Verifying token');
      }

      // Verify the token
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        audience: this.serviceId,
        complete: false,
      }) as DecodedToken;

      if (this.enableDebugLogs) {
        console.log('[JwtVerifier] Token verified successfully', {
          sub: decoded.sub,
          username: decoded.username,
          exp: new Date(decoded.exp * 1000).toISOString(),
        });
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Token has expired');
      }

      if (error instanceof jwt.JsonWebTokenError) {
        // Handle specific JWT errors
        if (error.message.includes('audience')) {
          throw new InvalidTokenError(`Token audience mismatch (expected: ${this.serviceId})`);
        }
        if (error.message.includes('issuer')) {
          throw new InvalidTokenError('Token issuer mismatch');
        }
        if (error.message.includes('signature')) {
          throw new InvalidTokenError('Invalid token signature');
        }
        throw new InvalidTokenError(`Token verification failed: ${error.message}`);
      }

      // Re-throw our custom errors
      if (error instanceof InvalidTokenError || error instanceof TokenExpiredError) {
        throw error;
      }

      // Unknown error
      throw new InvalidTokenError(`Unexpected error during token verification: ${error}`);
    }
  }
}
