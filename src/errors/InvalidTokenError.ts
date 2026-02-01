import { AuthError } from './AuthError.js';

/**
 * Error thrown when a token is invalid or cannot be verified
 */
export class InvalidTokenError extends AuthError {
  constructor(message = 'Invalid token', errorCode?: string) {
    super(message, 401, errorCode || 'INVALID_TOKEN');
    this.name = 'InvalidTokenError';
  }
}
