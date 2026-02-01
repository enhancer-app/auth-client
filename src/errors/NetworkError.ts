import { AuthError } from './AuthError.js';

/**
 * Error thrown when a network or connectivity issue occurs
 */
export class NetworkError extends AuthError {
  constructor(message = 'Network error occurred', errorCode?: string) {
    super(message, undefined, errorCode || 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}
