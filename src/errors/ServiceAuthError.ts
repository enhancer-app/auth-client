import { AuthError } from './AuthError.js';

/**
 * Error thrown when service-to-service authentication fails
 */
export class ServiceAuthError extends AuthError {
  constructor(message = 'Service authentication failed', errorCode?: string) {
    super(message, 401, errorCode || 'SERVICE_AUTH_FAILED');
    this.name = 'ServiceAuthError';
  }
}
