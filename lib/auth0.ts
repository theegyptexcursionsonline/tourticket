import { initAuth0 } from '@auth0/nextjs-auth0';

export default initAuth0({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  scope: 'openid profile email',
  redirectUri: process.env.AUTH0_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
  postLogoutRedirectUri: process.env.AUTH0_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000',
  session: {
    cookieSecret: process.env.AUTH0_COOKIE_SECRET!,
    cookieLifetime: 60 * 60 * 24 * 7, // 7 days
  },
});