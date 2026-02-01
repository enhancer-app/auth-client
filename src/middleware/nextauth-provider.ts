import type { EnhancerAuthConfig } from '../types/config.js';
import { sanitizeUrl } from '../utils/validators.js';

/**
 * Configuration for the Enhancer NextAuth/Auth.js provider
 */
export interface EnhancerProviderConfig
  extends Pick<
    EnhancerAuthConfig,
    'authBackendUrl' | 'authFrontendUrl' | 'serviceId' | 'serviceSecret'
  > {}

/**
 * Creates an Enhancer provider for NextAuth v5 (Auth.js)
 *
 * @param config - Provider configuration
 * @returns Auth.js provider configuration
 *
 * @example
 * ```typescript
 * // app/api/auth/[...nextauth]/route.ts
 * import { EnhancerProvider } from '@enhancer/auth-client/middleware/nextauth-provider';
 * import NextAuth from 'next-auth';
 *
 * export const { handlers, auth, signIn, signOut } = NextAuth({
 *   providers: [
 *     EnhancerProvider({
 *       authBackendUrl: process.env.AUTH_BACKEND_URL!,
 *       authFrontendUrl: process.env.AUTH_FRONTEND_URL!,
 *       serviceId: process.env.SERVICE_ID!,
 *       serviceSecret: process.env.SERVICE_SECRET!,
 *     }),
 *   ],
 * });
 *
 * export { handlers as GET, handlers as POST };
 * ```
 */
export function EnhancerProvider(config: EnhancerProviderConfig) {
  const { authBackendUrl, authFrontendUrl, serviceId, serviceSecret } = config;

  const frontendUrl = sanitizeUrl(authFrontendUrl);
  const backendUrl = sanitizeUrl(authBackendUrl);

  return {
    id: 'enhancer',
    name: 'Enhancer',
    type: 'oauth' as const,
    version: '2.0',

    // Authorization endpoint
    authorization: {
      url: `${frontendUrl}/login`,
      params: {
        service: serviceId,
        response_type: 'code',
      },
    },

    // Token exchange endpoint
    token: {
      url: `${backendUrl}/auth/exchange-code`,
      async request(context: {
        params: { code?: string; state?: string };
        provider: { clientId?: string };
      }) {
        const { code, state } = context.params;

        if (!code) {
          throw new Error('Authorization code is required');
        }

        // Exchange code for tokens
        const response = await fetch(`${backendUrl}/auth/exchange-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state: state || '',
            serviceId,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Token exchange failed: ${error}`);
        }

        const data = (await response.json()) as {
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
          tokenType: string;
        };

        return {
          tokens: {
            access_token: data.accessToken,
            refresh_token: data.refreshToken,
            expires_in: data.expiresIn,
            token_type: data.tokenType,
          },
        };
      },
    },

    // User info endpoint (decode JWT)
    userinfo: {
      async request(context: { tokens: { access_token?: string } }) {
        const accessToken = context.tokens.access_token;

        if (!accessToken) {
          throw new Error('Access token is required');
        }

        // Decode JWT (no verification needed, Auth.js will handle session)
        // In production, you might want to verify the token
        const parts = accessToken.split('.');
        const payload = parts[1];
        if (!payload) {
          throw new Error('Invalid JWT format');
        }
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString()) as {
          sub: string;
          username: string;
          email?: string;
          profilePicture: string;
          scope: string[];
        };

        return {
          id: decoded.sub,
          name: decoded.username,
          email: decoded.email || null,
          image: decoded.profilePicture,
          scope: decoded.scope,
        };
      },
    },

    // Profile mapping
    profile(profile: {
      id: string;
      name: string;
      email?: string | null;
      image: string;
      scope: string[];
    }) {
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email || null,
        image: profile.image,
        scope: profile.scope,
      };
    },

    // Client credentials
    clientId: serviceId,
    clientSecret: serviceSecret,

    // Additional options
    checks: ['state'] as const,
    style: {
      logo: '/enhancer-logo.svg',
      text: '#000',
      bg: '#fff',
    },
  };
}
