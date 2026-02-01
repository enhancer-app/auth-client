import type { AxiosInstance } from 'axios';
import { NetworkError } from '../errors/index.js';

/**
 * Manages caching and fetching of the RSA public key
 */
export class PublicKeyCache {
  private publicKey: string | null = null;
  private fetchPromise: Promise<string> | null = null;
  private readonly httpClient: AxiosInstance;
  private readonly enableDebugLogs: boolean;

  constructor(httpClient: AxiosInstance, enableDebugLogs = false) {
    this.httpClient = httpClient;
    this.enableDebugLogs = enableDebugLogs;
  }

  /**
   * Gets the public key, fetching it if not cached
   *
   * @returns The RSA public key in PEM format
   * @throws {NetworkError} If fetching fails after retries
   */
  async getPublicKey(): Promise<string> {
    // Return cached key if available
    if (this.publicKey) {
      if (this.enableDebugLogs) {
        console.log('[PublicKeyCache] Using cached public key');
      }
      return this.publicKey;
    }

    // If a fetch is already in progress, wait for it
    if (this.fetchPromise) {
      if (this.enableDebugLogs) {
        console.log('[PublicKeyCache] Waiting for in-progress fetch');
      }
      return this.fetchPromise;
    }

    // Fetch the public key
    this.fetchPromise = this.fetchPublicKey();

    try {
      this.publicKey = await this.fetchPromise;
      return this.publicKey;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Forces a refresh of the cached public key
   *
   * @returns The newly fetched public key
   * @throws {NetworkError} If fetching fails after retries
   */
  async refreshPublicKey(): Promise<string> {
    if (this.enableDebugLogs) {
      console.log('[PublicKeyCache] Forcing public key refresh');
    }
    this.publicKey = null;
    this.fetchPromise = null;
    return this.getPublicKey();
  }

  /**
   * Fetches the public key from the auth service with retry logic
   */
  private async fetchPublicKey(): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.enableDebugLogs) {
          console.log(`[PublicKeyCache] Fetching public key (attempt ${attempt}/${maxRetries})`);
        }

        const response = await this.httpClient.get<{ publicKey: string }>('/auth/public-key');

        if (!response.data?.publicKey) {
          throw new Error('Invalid response: missing publicKey field');
        }

        if (this.enableDebugLogs) {
          console.log('[PublicKeyCache] Successfully fetched public key');
        }

        return response.data.publicKey;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = 1000 * 2 ** (attempt - 1);
          if (this.enableDebugLogs) {
            console.log(`[PublicKeyCache] Retry in ${delayMs}ms...`);
          }
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new NetworkError(
      `Failed to fetch public key after ${maxRetries} attempts: ${lastError?.message}`
    );
  }
}
