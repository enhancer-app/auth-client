import type { AxiosInstance } from 'axios';
import { type ValidatedConfig, validateConfig } from './config.js';
import { PublicKeyCache } from './jwt/public-key-cache.js';
import { JwtVerifier } from './jwt/verifier.js';
import type { EnhancerAuthConfig } from './types/config.js';
import type { ConnectedAccount, DecodedToken, TokenResponse } from './types/index.js';
import { createHttpClient, withBasicAuth } from './utils/http-client.js';
import { sanitizeUrl } from './utils/validators.js';

/**
 * Main client for interacting with the Enhancer Auth Service
 *
 * @example
 * ```typescript
 * const client = new EnhancerAuthClient({
 *   authBackendUrl: 'http://localhost:8080',
 *   authFrontendUrl: 'https://auth.enhancer.at',
 *   serviceId: 'my-service',
 *   serviceSecret: 'secret_abc123',
 * });
 *
 * // Redirect user to login
 * const loginUrl = client.getLoginUrl();
 *
 * // Exchange code for tokens
 * const tokens = await client.exchangeCode(code, state);
 *
 * // Verify token
 * const decoded = await client.verifyToken(accessToken);
 * ```
 */
export class EnhancerAuthClient {
  private readonly config: ValidatedConfig;
  private readonly httpClient: AxiosInstance;
  private readonly publicKeyCache: PublicKeyCache;
  private readonly jwtVerifier: JwtVerifier;

  constructor(config: EnhancerAuthConfig) {
    // Validate and normalize configuration
    this.config = validateConfig(config);

    // Initialize HTTP client
    this.httpClient = createHttpClient(this.config);

    // Initialize JWT verification components
    this.publicKeyCache = new PublicKeyCache(this.httpClient, this.config.enableDebugLogs);
    this.jwtVerifier = new JwtVerifier(
      this.publicKeyCache,
      this.config.serviceId,
      this.config.enableDebugLogs
    );
  }

  // ============================================================================
  // OAuth Flow Methods
  // ============================================================================

  /**
   * Returns the login URL to redirect users to
   *
   * @returns Login URL for user authentication
   *
   * @example
   * ```typescript
   * const loginUrl = client.getLoginUrl();
   * // Returns: "https://auth.enhancer.at/login?service=my-service"
   * res.redirect(loginUrl);
   * ```
   */
  getLoginUrl(): string {
    const baseUrl = sanitizeUrl(this.config.authFrontendUrl);
    return `${baseUrl}/login?service=${encodeURIComponent(this.config.serviceId)}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   *
   * @param code - Authorization code from callback
   * @param state - State parameter from callback (for CSRF protection)
   * @returns Token response with access token and refresh token
   *
   * @example
   * ```typescript
   * app.get('/auth/callback', async (req, res) => {
   *   const { code, state } = req.query;
   *   const tokens = await client.exchangeCode(code, state);
   *   // Store tokens securely
   *   req.session.accessToken = tokens.accessToken;
   *   req.session.refreshToken = tokens.refreshToken;
   * });
   * ```
   */
  async exchangeCode(code: string, state: string): Promise<TokenResponse> {
    const response = await this.httpClient.post<TokenResponse>('/auth/exchange-code', {
      code,
      state,
      serviceId: this.config.serviceId,
    });

    return response.data;
  }

  /**
   * Refresh access token using refresh token
   *
   * @param refreshToken - The refresh token
   * @returns New token response with fresh access token
   *
   * @example
   * ```typescript
   * try {
   *   const decoded = await client.verifyToken(accessToken);
   * } catch (error) {
   *   if (error instanceof TokenExpiredError) {
   *     const newTokens = await client.refreshToken(refreshToken);
   *     // Update stored tokens
   *   }
   * }
   * ```
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await this.httpClient.post<TokenResponse>('/auth/refresh', {
      refreshToken,
    });

    return response.data;
  }

  // ============================================================================
  // JWT Verification Methods
  // ============================================================================

  /**
   * Verify and decode JWT access token
   *
   * @param token - JWT access token to verify
   * @returns Decoded token payload
   * @throws {TokenExpiredError} If token has expired
   * @throws {InvalidTokenError} If token is invalid or verification fails
   *
   * @example
   * ```typescript
   * const decoded = await client.verifyToken(accessToken);
   * console.log({
   *   accountId: decoded.sub,
   *   username: decoded.username,
   *   scopes: decoded.scope,
   * });
   * ```
   */
  async verifyToken(token: string): Promise<DecodedToken> {
    return this.jwtVerifier.verify(token);
  }

  /**
   * Get the RSA public key used for JWT verification
   *
   * The public key is cached in memory after the first fetch.
   *
   * @returns RSA public key in PEM format
   *
   * @example
   * ```typescript
   * const publicKey = await client.getPublicKey();
   * ```
   */
  async getPublicKey(): Promise<string> {
    return this.publicKeyCache.getPublicKey();
  }

  /**
   * Manually refresh the cached public key
   *
   * Use this if you suspect the auth service has rotated its keys.
   *
   * @returns Newly fetched public key
   *
   * @example
   * ```typescript
   * await client.refreshPublicKey();
   * ```
   */
  async refreshPublicKey(): Promise<void> {
    await this.publicKeyCache.refreshPublicKey();
  }

  // ============================================================================
  // Service API Methods
  // ============================================================================

  /**
   * Get connected accounts for a user
   *
   * Requires service-to-service authentication using serviceId and serviceSecret.
   *
   * @param accountId - Account UUID
   * @returns Array of connected accounts
   *
   * @example
   * ```typescript
   * const connectedAccounts = await client.getConnectedAccounts(accountId);
   * connectedAccounts.forEach(account => {
   *   console.log(`${account.provider}: ${account.username}`);
   * });
   * ```
   */
  async getConnectedAccounts(accountId: string): Promise<ConnectedAccount[]> {
    const response = await this.httpClient.get<ConnectedAccount[]>(
      `/api/service/accounts/${accountId}/connected-accounts`,
      withBasicAuth(this.config.serviceId, this.config.serviceSecret)
    );

    return response.data;
  }
}
