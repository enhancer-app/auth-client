import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify';
import type { EnhancerAuthClient } from '../client.js';
import { InvalidTokenError, TokenExpiredError } from '../errors/index.js';
import type { DecodedToken } from '../types/tokens.js';

/**
 * Options for the Fastify plugin
 */
export interface EnhancerAuthPluginOptions {
  /**
   * EnhancerAuthClient instance
   */
  client: EnhancerAuthClient;
}

/**
 * Options for the auth decorator
 */
export interface EnhancerAuthDecoratorOptions {
  /**
   * Required scopes for accessing the route
   */
  requiredScopes?: string[];
}

/**
 * Extended Fastify Request with user property
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: DecodedToken;
  }

  interface FastifyInstance {
    enhancerAuth: (
      options?: EnhancerAuthDecoratorOptions
    ) => (
      request: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ) => Promise<void>;
  }
}

/**
 * Fastify plugin for Enhancer Auth authentication
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import { EnhancerAuthClient } from '@enhancer/auth-client';
 * import { enhancerAuth } from '@enhancer/auth-client/middleware/fastify';
 *
 * const fastify = Fastify();
 * const authClient = new EnhancerAuthClient({ ... });
 *
 * // Register plugin
 * await fastify.register(enhancerAuth, { client: authClient });
 *
 * // Use decorator
 * fastify.get('/protected', {
 *   preHandler: fastify.enhancerAuth()
 * }, async (request, reply) => {
 *   return { user: request.user };
 * });
 *
 * // With scope validation
 * fastify.get('/admin', {
 *   preHandler: fastify.enhancerAuth({ requiredScopes: ['ADMIN'] })
 * }, async (request, reply) => {
 *   return { message: 'Admin only' };
 * });
 * ```
 */
export const enhancerAuth: FastifyPluginAsync<EnhancerAuthPluginOptions> = async (
  fastify,
  options
) => {
  const { client } = options;

  if (!client) {
    throw new Error('EnhancerAuthClient instance is required');
  }

  /**
   * Decorator function for route-level authentication
   */
  fastify.decorate('enhancerAuth', (decoratorOptions: EnhancerAuthDecoratorOptions = {}) => {
    return async (
      request: FastifyRequest,
      reply: FastifyReply,
      done: HookHandlerDoneFunction
    ): Promise<void> => {
      try {
        // Extract Authorization header
        const authHeader = request.headers.authorization;

        if (!authHeader) {
          reply.code(401).send({
            error: 'Unauthorized',
            message: 'Missing Authorization header',
          });
          return;
        }

        // Check Bearer format
        if (!authHeader.startsWith('Bearer ')) {
          reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid Authorization header format. Expected: Bearer <token>',
          });
          return;
        }

        // Extract token
        const token = authHeader.slice(7);

        if (!token) {
          reply.code(401).send({
            error: 'Unauthorized',
            message: 'Missing token',
          });
          return;
        }

        // Verify token
        const decoded = await client.verifyToken(token);

        // Check required scopes if specified
        if (decoratorOptions.requiredScopes && decoratorOptions.requiredScopes.length > 0) {
          const userScopes = decoded.scope || [];
          const hasAllScopes = decoratorOptions.requiredScopes.every((scope) =>
            userScopes.includes(scope)
          );

          if (!hasAllScopes) {
            reply.code(403).send({
              error: 'Forbidden',
              message: 'Insufficient permissions',
              requiredScopes: decoratorOptions.requiredScopes,
              userScopes,
            });
            return;
          }
        }

        // Attach user to request
        request.user = decoded;

        // Continue
        done();
      } catch (error) {
        if (error instanceof TokenExpiredError) {
          reply.code(401).send({
            error: 'Unauthorized',
            message: 'Token has expired',
            code: 'TOKEN_EXPIRED',
          });
          return;
        }

        if (error instanceof InvalidTokenError) {
          reply.code(401).send({
            error: 'Unauthorized',
            message: error.message,
            code: 'INVALID_TOKEN',
          });
          return;
        }

        // Other errors
        fastify.log.error(error, '[EnhancerAuth] Unexpected error in auth decorator');
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'An error occurred during authentication',
        });
      }
    };
  });
};
