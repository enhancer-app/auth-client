/**
 * Base error class for all authentication-related errors
 */
export class AuthError extends Error {
  /**
   * HTTP status code associated with this error
   */
  public readonly statusCode?: number;

  /**
   * Application-specific error code
   */
  public readonly errorCode?: string;

  constructor(message: string, statusCode?: number, errorCode?: string) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
