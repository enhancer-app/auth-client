/**
 * Token response from exchange-code and refresh endpoints
 */
export interface TokenResponse {
  /**
   * JWT access token
   */
  accessToken: string;

  /**
   * Refresh token for obtaining new access tokens
   */
  refreshToken: string;

  /**
   * Token expiration time in seconds
   */
  expiresIn: number;

  /**
   * Token type (always "Bearer")
   */
  tokenType: string;
}

/**
 * Decoded JWT access token payload
 */
export interface DecodedToken {
  /**
   * Subject - Account UUID
   */
  sub: string;

  /**
   * Username
   */
  username: string;

  /**
   * Profile picture URL
   */
  profilePicture: string;

  /**
   * Issuer
   */
  iss: string;

  /**
   * Expiration timestamp (Unix timestamp in seconds)
   */
  exp: number;

  /**
   * Issued at timestamp (Unix timestamp in seconds)
   */
  iat: number;

  /**
   * Audience (should match your service ID)
   */
  aud: string;

  /**
   * Granted scopes
   */
  scope: string[];
}
