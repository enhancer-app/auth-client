import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { EnhancerAuthClient } from '@enhancer/auth-client';
import { enhancerAuth } from '@enhancer/auth-client/middleware/fastify';

const fastify = Fastify({ logger: true });
const PORT = 3001;

// Initialize auth client
const authClient = new EnhancerAuthClient({
  authBackendUrl: process.env.AUTH_BACKEND_URL || 'http://localhost:8080',
  authFrontendUrl: process.env.AUTH_FRONTEND_URL || 'https://auth.enhancer.at',
  serviceId: process.env.SERVICE_ID || 'your-service-id',
  serviceSecret: process.env.SERVICE_SECRET || 'your-service-secret',
  enableDebugLogs: true,
});

// Register cookie plugin
await fastify.register(fastifyCookie);

// Register auth plugin
await fastify.register(enhancerAuth, { client: authClient });

// Public routes
fastify.get('/', async (request, reply) => {
  return {
    message: 'Welcome to the Fastify Enhancer Auth Example',
    endpoints: {
      login: '/auth/login',
      callback: '/auth/callback',
      profile: '/api/profile (requires auth)',
      admin: '/api/admin (requires ADMIN scope)',
    },
  };
});

// Redirect to auth service
fastify.get('/auth/login', async (request, reply) => {
  const loginUrl = authClient.getLoginUrl();
  return reply.redirect(loginUrl);
});

// OAuth callback
fastify.get('/auth/callback', async (request, reply) => {
  const { code, state } = request.query as { code?: string; state?: string };

  if (!code) {
    return reply.code(400).send({ error: 'Missing authorization code' });
  }

  try {
    // Exchange code for tokens
    const tokens = await authClient.exchangeCode(code, state || '');

    // Store tokens in secure cookies
    reply
      .setCookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: false, // Set true in production
        path: '/',
        maxAge: 3600,
      })
      .setCookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: false,
        path: '/',
        maxAge: 7 * 24 * 3600,
      });

    return reply.redirect('/api/profile');
  } catch (error) {
    fastify.log.error(error, 'Auth callback error');
    return reply.code(500).send({ error: 'Authentication failed' });
  }
});

// Logout
fastify.get('/auth/logout', async (request, reply) => {
  reply.clearCookie('accessToken').clearCookie('refreshToken');
  return { message: 'Logged out successfully' };
});

// Protected routes
fastify.get(
  '/api/profile',
  {
    preHandler: fastify.enhancerAuth(),
  },
  async (request, reply) => {
    return {
      user: request.user,
      message: 'This is your profile',
    };
  }
);

// Admin-only route
fastify.get(
  '/api/admin',
  {
    preHandler: fastify.enhancerAuth({ requiredScopes: ['ADMIN'] }),
  },
  async (request, reply) => {
    return {
      message: 'Admin access granted',
      user: request.user,
    };
  }
);

// Get connected accounts
fastify.get(
  '/api/connected-accounts',
  {
    preHandler: fastify.enhancerAuth(),
  },
  async (request, reply) => {
    try {
      const accounts = await authClient.getConnectedAccounts(request.user!.sub);
      return { accounts };
    } catch (error) {
      fastify.log.error(error, 'Failed to fetch connected accounts');
      return reply.code(500).send({ error: 'Failed to fetch connected accounts' });
    }
  }
);

// Start server
fastify.listen({ port: PORT }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Fastify app listening on ${address}`);
  console.log(`Login at: ${address}/auth/login`);
});
