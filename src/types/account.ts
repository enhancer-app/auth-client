/**
 * Supported OAuth providers
 */
export type Provider = 'TWITCH' | 'KICK';

/**
 * Connected account from Service API
 */
export interface ConnectedAccount {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * OAuth provider
   */
  provider: Provider;

  /**
   * Provider-specific user ID
   */
  providerUserId: string;

  /**
   * Username on the provider platform
   */
  username: string;

  /**
   * Profile picture URL from provider
   */
  profilePictureUrl: string;

  /**
   * Whether this is the primary account
   */
  isPrimary: boolean;

  /**
   * When the account was linked (ISO 8601 timestamp)
   */
  linkedAt: string;
}
