// lib/auth0.ts
import { Auth0Client, Auth0ClientOptions } from '@auth0/nextjs-auth0/server';
import { ManagementClient, AuthenticationClient } from 'auth0';

/**
 * auth0 client instance (server)
 * - The Auth0Client reads required info from environment variables if not provided.
 * - Env vars expected (recommended names):
 *    AUTH0_DOMAIN
 *    AUTH0_CLIENT_ID
 *    AUTH0_CLIENT_SECRET
 *    AUTH0_SECRET        (session cookie encryption secret)
 *    APP_BASE_URL        (or AUTH0_BASE_URL in older code)
 *
 * See README/docs for additional cookie/session configuration options.
 */

const clientOptions: Partial<Auth0ClientOptions> = {
  // You can pass explicit values here OR rely on env vars; keep this object minimal.
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  appBaseUrl: process.env.APP_BASE_URL || process.env.AUTH0_BASE_URL,
  secret: process.env.AUTH0_SECRET,
  // you may configure session, routes, etc. here if you need custom behavior
};

export const auth0 = new Auth0Client(clientOptions);

/**
 * Optional: ManagementClient & AuthenticationClient from `auth0` (useful for admin tasks).
 * Ensure you keep credentials secure and use a M2M client with restricted scopes where possible.
 */
export const managementClient = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  scope: 'read:users update:users create:users delete:users read:roles',
});

export const authenticationClient = new AuthenticationClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
});

// Helpful re-exports (optional) — use auth0.* methods directly instead if you prefer
export const getSession = (...args: Parameters<typeof auth0.getSession>) =>
  auth0.getSession(...args);

export const getAccessToken = (...args: Parameters<typeof auth0.getAccessToken>) =>
  auth0.getAccessToken(...args);

export const middleware = (...args: Parameters<typeof auth0.middleware>) =>
  auth0.middleware(...args);

export default auth0;
