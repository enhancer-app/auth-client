import { z } from 'zod';
import type { EnhancerAuthConfig } from './types/config.js';

/**
 * Zod schema for validating EnhancerAuthConfig
 */
const configSchema = z.object({
  authBackendUrl: z
    .string()
    .url({ message: 'authBackendUrl must be a valid HTTP/HTTPS URL' })
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'authBackendUrl must start with http:// or https://'
    ),

  authFrontendUrl: z
    .string()
    .url({ message: 'authFrontendUrl must be a valid HTTP/HTTPS URL' })
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'authFrontendUrl must start with http:// or https://'
    ),

  serviceId: z.string().min(1, 'serviceId is required'),

  serviceSecret: z.string().optional(),

  timeout: z.number().positive().optional().default(10000),

  publicKeyCacheTTL: z.number().positive().optional().default(Number.POSITIVE_INFINITY),

  enableDebugLogs: z.boolean().optional().default(false),
});

/**
 * Validated configuration type with defaults applied
 */
export type ValidatedConfig = z.infer<typeof configSchema>;

/**
 * Validates and normalizes the configuration
 *
 * @param config - Raw configuration object
 * @returns Validated configuration with defaults applied
 * @throws {z.ZodError} If configuration is invalid
 *
 * @example
 * ```typescript
 * const config = validateConfig({
 *   authBackendUrl: 'http://localhost:8080',
 *   authFrontendUrl: 'https://auth.enhancer.at',
 *   serviceId: 'my-service',
 *   serviceSecret: 'secret_abc123', // Optional - only needed for service-to-service APIs
 * });
 * ```
 */
export function validateConfig(config: EnhancerAuthConfig): ValidatedConfig {
  try {
    return configSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Configuration validation failed: ${messages}`);
    }
    throw error;
  }
}
