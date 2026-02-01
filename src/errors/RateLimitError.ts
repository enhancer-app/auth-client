import { AuthError } from './AuthError.js';

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends AuthError {
  /**
   * Number of seconds to wait before retrying
   */
  public readonly retryAfter?: number;

  constructor(message = 'Rate limit exceeded', retryAfter?: number, errorCode?: string) {
    super(message, 429, errorCode || 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}
