import type { NextFunction, Request, Response } from 'express';
import type { EnhancerAuthClient } from '../client.js';
import { InvalidTokenError, TokenExpiredError } from '../errors/index.js';
import type { DecodedToken } from '../types/tokens.js';

/**
 * Options for the requireAuth middleware
 */
export interface RequireAuthOptions {
  /**
   * Required scopes for accessing the route
   */
  requiredScopes?: string[];
}

/**
 * Extended Express Request with user property
 */
export interface AuthenticatedRequest extends Request {
  /**
   * Decoded JWT token payload
   */
  user: DecodedToken;
}

/**
 * Express middleware factory for protecting routes with JWT authentication
 *
 * @param client - EnhancerAuthClient instance
 * @param options - Middleware options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { EnhancerAuthClient } from '@enhancer/auth-client';
 * import { requireAuth } from '@enhancer/auth-client/middleware/express';
 *
 * const app = express();
 * const authClient = new EnhancerAuthClient({ ... });
 *
 * // Basic usage
 * app.get('/protected', requireAuth(authClient), (req, res) => {
 *   res.json({ user: req.user });
 * });
 *
 * // With scope validation
 * app.get('/admin', requireAuth(authClient, { requiredScopes: ['ADMIN'] }), (req, res) => {
 *   res.json({ message: 'Admin only' });
 * });
 * ```
 */
export function requireAuth(
  client: EnhancerAuthClient,
  options: RequireAuthOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing Authorization header',
        });
        return;
      }

      // Check Bearer format
      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid Authorization header format. Expected: Bearer <token>',
        });
        return;
      }

      // Extract token
      const token = authHeader.slice(7); // Remove 'Bearer ' prefix

      if (!token) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing token',
        });
        return;
      }

      // Verify token
      const decoded = await client.verifyToken(token);

      // Check required scopes if specified
      if (options.requiredScopes && options.requiredScopes.length > 0) {
        const userScopes = decoded.scope || [];
        const hasAllScopes = options.requiredScopes.every((scope) => userScopes.includes(scope));

        if (!hasAllScopes) {
          res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions',
            requiredScopes: options.requiredScopes,
            userScopes,
          });
          return;
        }
      }

      // Attach user to request
      (req as AuthenticatedRequest).user = decoded;

      // Continue to next middleware
      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }

      if (error instanceof InvalidTokenError) {
        res.status(401).json({
          error: 'Unauthorized',
          message: error.message,
          code: 'INVALID_TOKEN',
        });
        return;
      }

      // Other errors
      console.error('[EnhancerAuth] Unexpected error in requireAuth middleware:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during authentication',
      });
    }
  };
}

/**
 * Type guard to check if request has been authenticated
 */
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return 'user' in req && req.user !== undefined;
}
