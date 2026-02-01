import express from 'express';
import session from 'express-session';
import { EnhancerAuthClient, TokenExpiredError } from '@enhancer/auth-client';
import { requireAuth } from '@enhancer/auth-client/middleware/express';

const app = express();
const PORT = 3000;

// Initialize auth client
const authClient = new EnhancerAuthClient({
  authBackendUrl: process.env.AUTH_BACKEND_URL || 'http://localhost:8080',
  authFrontendUrl: process.env.AUTH_FRONTEND_URL || 'https://auth.enhancer.at',
  serviceId: process.env.SERVICE_ID || 'your-service-id',
  serviceSecret: process.env.SERVICE_SECRET || 'your-service-secret',
  enableDebugLogs: true,
});

// Session middleware
app.use(
  session({
    secret: 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set true in production with HTTPS
  })
);

app.use(express.json());

// Public routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Enhancer Auth Example',
    authenticated: !!req.session.accessToken,
    endpoints: {
      login: '/auth/login',
      callback: '/auth/callback',
      profile: '/api/profile (requires auth)',
      admin: '/api/admin (requires ADMIN scope)',
    },
  });
});

// Redirect to auth service
app.get('/auth/login', (req, res) => {
  const loginUrl = authClient.getLoginUrl();
  res.redirect(loginUrl);
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Exchange code for tokens
    const tokens = await authClient.exchangeCode(code, (state as string) || '');

    // Store tokens in session
    req.session.accessToken = tokens.accessToken;
    req.session.refreshToken = tokens.refreshToken;

    res.redirect('/api/profile');
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Logout
app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

// Protected routes
app.get('/api/profile', requireAuth(authClient), (req, res) => {
  res.json({
    user: req.user,
    message: 'This is your profile',
  });
});

// Admin-only route
app.get('/api/admin', requireAuth(authClient, { requiredScopes: ['ADMIN'] }), (req, res) => {
  res.json({
    message: 'Admin access granted',
    user: req.user,
  });
});

// Get connected accounts
app.get('/api/connected-accounts', requireAuth(authClient), async (req, res) => {
  try {
    const accounts = await authClient.getConnectedAccounts(req.user.sub);
    res.json({ accounts });
  } catch (error) {
    console.error('Failed to fetch connected accounts:', error);
    res.status(500).json({ error: 'Failed to fetch connected accounts' });
  }
});

// Error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

app.listen(PORT, () => {
  console.log(`Express app listening on http://localhost:${PORT}`);
  console.log(`Login at: http://localhost:${PORT}/auth/login`);
});
