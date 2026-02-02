# Next.js Example

This example demonstrates how to use `@enhancer/auth-client` with Next.js 14+ and NextAuth v5 (Auth.js).

## Features

- OAuth 2.0 authentication with NextAuth v5
- Server-side session management
- Protected pages and API routes
- Client and server components
- Middleware-based route protection

## Setup

1. Install dependencies:

```bash
pnpm install
# or
npm install
```

2. Create a `.env.local` file:

```env
AUTH_BACKEND_URL=http://localhost:8080
AUTH_FRONTEND_URL=https://auth.enhancer.at
SERVICE_ID=your-service-id
# Optional - only needed for service-to-service APIs like getConnectedAccounts()
SERVICE_SECRET=your-service-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

3. Run the development server:

```bash
pnpm dev
```

## File Structure

```
app/
├── api/auth/[...nextauth]/route.ts  # NextAuth configuration
├── protected/page.tsx                # Protected page
├── page.tsx                          # Public home page
└── layout.tsx                        # Root layout
```

## Usage

See the full Next.js documentation for NextAuth v5 integration at https://authjs.dev/getting-started/installation
