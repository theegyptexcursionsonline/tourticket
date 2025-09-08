// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticationClient } from '@/lib/auth0';

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Notes:
 * - This uses Resource Owner Password Grant (ROPG). ROPG must be enabled
 *   for the Auth0 client and is generally discouraged for public clients.
 * - Recommended: use Authorization Code + PKCE (redirect login) for web apps.
 * - Add server-side rate limiting to protect against brute force attempts.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email?.toString()?.trim();
    const password = body?.password?.toString();

    // Basic validation
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Perform token exchange (ROPG)
    // Make sure ROPG is enabled for the client in your Auth0 dashboard
    const authResult = await authenticationClient.oauth.passwordGrant({
      username: email,
      password: password,
      scope: 'openid profile email',
      // audience is optional. If you request an API audience, Auth0 will return an access token for that API.
      audience: process.env.AUTH0_AUDIENCE || undefined,
    });

    // authResult usually contains: access_token, id_token, refresh_token, expires_in, token_type
    if (!authResult || !authResult.access_token) {
      console.error('Auth0 passwordGrant returned no access_token', authResult);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Get user info from the standard /userinfo endpoint using the access_token
    const userinfoEndpoint = `${process.env.AUTH0_ISSUER_BASE_URL!.replace(/\/$/, '')}/userinfo`;

    const userResp = await fetch(userinfoEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authResult.access_token}`,
        Accept: 'application/json',
      },
    });

    if (!userResp.ok) {
      const txt = await userResp.text();
      console.error('Failed to fetch userinfo:', userResp.status, txt);
      // Still return tokens to the client if you want, but we prefer failing early
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 502 });
    }

    const userProfile: any = await userResp.json();

    // Prepare user data (pick fields you need)
    const userData = {
      id: userProfile.sub,
      email: userProfile.email,
      name: userProfile.name,
      firstName: userProfile.given_name || userProfile.name?.split(' ')[0] || '',
      lastName: userProfile.family_name || userProfile.name?.split(' ').slice(1).join(' ') || '',
      picture: userProfile.picture,
      emailVerified: userProfile.email_verified,
      // userinfo doesn't contain created_at usually; use updated_at if present
      createdAt: userProfile.updated_at || null,
    };

    // Build response and set secure HTTP-only cookies
    const response = NextResponse.json({
      success: true,
      user: userData,
      tokens: {
        accessToken: authResult.access_token,
        idToken: authResult.id_token,
        refreshToken: authResult.refresh_token,
        expiresIn: authResult.expires_in ?? null,
      },
    });

    // Cookie options — tune maxAge to match token expiry/refresh strategy
    const isProd = process.env.NODE_ENV === 'production';
    const tokenMaxAge = Number(authResult.expires_in ?? 60 * 60 * 24); // fallback 1 day

    // Access token cookie (httpOnly)
    response.cookies.set('auth0_access_token', authResult.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: tokenMaxAge,
      path: '/',
    });

    // ID token cookie (httpOnly)
    if (authResult.id_token) {
      response.cookies.set('auth0_id_token', authResult.id_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: tokenMaxAge,
        path: '/',
      });
    }

    // Refresh token cookie — longer expiry
    if (authResult.refresh_token) {
      response.cookies.set('auth0_refresh_token', authResult.refresh_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        // 30 days
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }

    // Optionally set a non-httpOnly cookie for client-side UI (e.g. user name),
    // but avoid storing sensitive tokens in non-httpOnly cookies.
    response.cookies.set('user_name', userData.name || '', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge: tokenMaxAge,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);

    // Normalize Auth0 SDK errors
    const status = err?.statusCode || err?.status || (err?.error === 'invalid_grant' ? 401 : 500);

    if (err?.error === 'invalid_grant' || status === 401) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (err?.error === 'too_many_attempts') {
      return NextResponse.json({ error: 'Too many failed attempts. Please try again later.' }, { status: 429 });
    }

    return NextResponse.json({ error: 'Login failed. Please try again later.' }, { status: 500 });
  }
}
