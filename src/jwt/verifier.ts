import * as jose from 'jose';
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

      // Import the public key for jose
      const cryptoKey = await jose.importSPKI(publicKey, 'RS256');

      // Verify the token
      const { payload } = await jose.jwtVerify(token, cryptoKey, {
        algorithms: ['RS256'],
        audience: this.serviceId,
      });

      // Validate required custom fields
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.username !== 'string' ||
        typeof payload.profilePicture !== 'string' ||
        typeof payload.iss !== 'string' ||
        typeof payload.exp !== 'number' ||
        typeof payload.iat !== 'number' ||
        typeof payload.aud !== 'string' ||
        !Array.isArray(payload.scope)
      ) {
        throw new InvalidTokenError('Token payload missing required fields');
      }

      const decoded: DecodedToken = {
        sub: payload.sub,
        username: payload.username,
        profilePicture: payload.profilePicture,
        iss: payload.iss,
        exp: payload.exp,
        iat: payload.iat,
        aud: payload.aud,
        scope: payload.scope,
      };

      if (this.enableDebugLogs) {
        console.log('[JwtVerifier] Token verified successfully', {
          sub: decoded.sub,
          username: decoded.username,
          exp: new Date(decoded.exp * 1000).toISOString(),
        });
      }

      return decoded;
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        throw new TokenExpiredError('Token has expired');
      }

      if (error instanceof jose.errors.JWTClaimValidationFailed) {
        // Handle specific JWT claim validation errors
        if (error.message.includes('audience')) {
          throw new InvalidTokenError(`Token audience mismatch (expected: ${this.serviceId})`);
        }
        if (error.message.includes('issuer')) {
          throw new InvalidTokenError('Token issuer mismatch');
        }
        throw new InvalidTokenError(`Token claim validation failed: ${error.message}`);
      }

      if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
        throw new InvalidTokenError('Invalid token signature');
      }

      if (error instanceof jose.errors.JOSEError) {
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
