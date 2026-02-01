import { AuthError } from './AuthError.js';

/**
 * Error thrown when a JWT token has expired
 */
export class TokenExpiredError extends AuthError {
  constructor(message = 'Token has expired', errorCode?: string) {
    super(message, 401, errorCode || 'TOKEN_EXPIRED');
    this.name = 'TokenExpiredError';
  }
}
