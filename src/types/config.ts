/**
 * Configuration interface for EnhancerAuthClient
 */
export interface EnhancerAuthConfig {
  /**
   * Backend API base URL (e.g., "http://localhost:8080")
   */
  authBackendUrl: string;

  /**
   * Frontend base URL for login redirects (e.g., "https://auth.enhancer.at")
   */
  authFrontendUrl: string;

  /**
   * Your registered service ID
   */
  serviceId: string;

  /**
   * Your service secret for authentication
   */
  serviceSecret: string;

  /**
   * HTTP request timeout in milliseconds
   * @default 10000
   */
  timeout?: number;

  /**
   * Public key cache TTL in milliseconds
   * @default Infinity (cache forever)
   */
  publicKeyCacheTTL?: number;

  /**
   * Enable debug logging
   * @default false
   */
  enableDebugLogs?: boolean;
}
