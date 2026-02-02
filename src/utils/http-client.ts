import axios, { type AxiosInstance, type AxiosError, type AxiosRequestConfig } from 'axios';
import type { ValidatedConfig } from '../config.js';
import {
  AuthError,
  InvalidTokenError,
  NetworkError,
  RateLimitError,
  ServiceAuthError,
} from '../errors';

/**
 * Creates a configured axios instance with error handling
 */
export function createHttpClient(config: ValidatedConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.authBackendUrl,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': '@enhancer/auth-client',
    },
  });

  // Request interceptor for debug logging
  client.interceptors.request.use(
    (requestConfig) => {
      if (config.enableDebugLogs) {
        console.log('[EnhancerAuth] Request:', {
          method: requestConfig.method?.toUpperCase(),
          url: requestConfig.url,
          baseURL: requestConfig.baseURL,
        });
      }
      return requestConfig;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error transformation
  client.interceptors.response.use(
    (response) => {
      if (config.enableDebugLogs) {
        console.log('[EnhancerAuth] Response:', {
          status: response.status,
          url: response.config.url,
        });
      }
      return response;
    },
    (error: AxiosError) => {
      const transformedError = transformAxiosError(error);
      if (config.enableDebugLogs) {
        console.error('[EnhancerAuth] Error:', {
          name: transformedError.name,
          message: transformedError.message,
          statusCode: transformedError.statusCode,
        });
      }
      return Promise.reject(transformedError);
    }
  );

  return client;
}

/**
 * Transform axios errors to custom error classes
 */
function transformAxiosError(error: AxiosError): AuthError {
  // Network errors (no response received)
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new NetworkError('Request timeout');
    }
    return new NetworkError(`Network error: ${error.message}`);
  }

  const { status, data } = error.response;
  const errorMessage =
    typeof data === 'object' && data !== null && 'message' in data
      ? String(data.message)
      : error.message;

  // Map HTTP status codes to custom errors
  switch (status) {
    case 401: {
      // Check if it's a service auth failure or token issue
      const isServiceAuth = error.config?.headers?.Authorization?.toString().startsWith('Basic');
      return isServiceAuth
        ? new ServiceAuthError(errorMessage)
        : new InvalidTokenError(errorMessage);
    }
    case 429: {
      // Extract retry-after header if available
      const retryAfter = error.response.headers['retry-after'];
      const retryAfterSeconds = retryAfter ? Number.parseInt(retryAfter, 10) : undefined;
      return new RateLimitError(errorMessage, retryAfterSeconds);
    }
    default:
      return new AuthError(errorMessage, status);
  }
}

/**
 * Creates Basic Auth header for service-to-service authentication
 */
export function createBasicAuthHeader(serviceId: string, serviceSecret: string): string {
  const credentials = `${serviceId}:${serviceSecret}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Adds Basic Auth to request config
 * @param serviceId - Your registered service ID
 * @param serviceSecret - Your service secret for authentication (optional in config, required when calling this function)
 * @param config - Optional additional Axios request config
 * @returns Axios request config with Basic Auth header
 */
export function withBasicAuth(
  serviceId: string,
  serviceSecret: string,
  config?: AxiosRequestConfig
): AxiosRequestConfig {
  return {
    ...config,
    headers: {
      ...config?.headers,
      Authorization: createBasicAuthHeader(serviceId, serviceSecret),
    },
  };
}
