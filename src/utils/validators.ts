/**
 * Validates if a string is a valid UUID v4
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validates if a string appears to be a JWT token (three base64 parts separated by dots)
 */
export function isValidJWTFormat(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Sanitizes a URL by removing trailing slashes
 */
export function sanitizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
