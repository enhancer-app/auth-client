/**
 * Browser and Node.js compatible base64 encoding/decoding utilities
 */

/**
 * Encode a string to base64
 * Works in both browser and Node.js environments
 *
 * @param str - String to encode
 * @returns Base64 encoded string
 */
export function encodeBase64(str: string): string {
  // Check if we're in a browser environment
  if (typeof globalThis !== 'undefined' && 'btoa' in globalThis) {
    return globalThis.btoa(str);
  }

  // Node.js environment - check if Buffer is available
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64');
  }

  // Fallback error
  throw new Error('No base64 encoding function available');
}

/**
 * Decode a base64 string
 * Works in both browser and Node.js environments
 *
 * @param base64 - Base64 encoded string
 * @returns Decoded string
 */
export function decodeBase64(base64: string): string {
  // Check if we're in a browser environment
  if (typeof globalThis !== 'undefined' && 'atob' in globalThis) {
    return globalThis.atob(base64);
  }

  // Node.js environment - check if Buffer is available
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString();
  }

  // Fallback error
  throw new Error('No base64 decoding function available');
}
