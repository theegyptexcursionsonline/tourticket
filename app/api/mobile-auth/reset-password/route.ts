import {NextRequest, NextResponse} from 'next/server';
import {PublicInputError, readBoundedJson} from '@/lib/security/publicInput';

export const dynamic = 'force-dynamic';

const RESET_TOKEN = /^[a-f0-9]{64}$/i;
const DEFAULT_MOBILE_BACKEND = 'https://eeo-backend-production.up.railway.app';
const PROVIDER_TIMEOUT_MS = 10_000;

function noStoreJson(body: Record<string, unknown>, status: number, retryAfter?: string) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      ...(retryAfter ? {'Retry-After': retryAfter} : {}),
    },
  });
}

function mobileBackendOrigin(): string {
  const raw = process.env.EEO_MOBILE_BACKEND_URL?.trim() || DEFAULT_MOBILE_BACKEND;
  const parsed = new URL(raw);
  const localDevelopment =
    process.env.NODE_ENV !== 'production' &&
    parsed.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(parsed.hostname);

  if (
    (parsed.protocol !== 'https:' && !localDevelopment) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('mobile_password_reset_backend_invalid');
  }

  return parsed.origin;
}

export async function POST(request: NextRequest) {
  try {
    const body = await readBoundedJson<{
      token?: unknown;
      password?: unknown;
      confirmPassword?: unknown;
    }>(request, 4_096);
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const confirmPassword =
      typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

    if (!RESET_TOKEN.test(token)) {
      throw new PublicInputError('This reset link is invalid or incomplete.');
    }
    if (password.length < 8 || password.length > 128) {
      throw new PublicInputError('Password must be between 8 and 128 characters.');
    }
    if (password !== confirmPassword) {
      throw new PublicInputError('Passwords do not match.');
    }

    const upstream = await fetch(`${mobileBackendOrigin()}/api/auth/reset-password`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token, password, confirmPassword}),
      cache: 'no-store',
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (upstream.ok) {
      return noStoreJson(
        {success: true, message: 'Your password has been updated.'},
        200,
      );
    }
    if (upstream.status === 400 || upstream.status === 404) {
      return noStoreJson(
        {success: false, error: 'This reset link is invalid or has expired. Request a new link and try again.'},
        400,
      );
    }
    if (upstream.status === 429) {
      return noStoreJson(
        {success: false, error: 'Too many attempts. Please wait before trying again.'},
        429,
        upstream.headers.get('retry-after') || undefined,
      );
    }

    return noStoreJson(
      {success: false, error: 'Password reset is temporarily unavailable. Please try again later.'},
      503,
    );
  } catch (error) {
    if (error instanceof PublicInputError) {
      return noStoreJson({success: false, error: error.message}, error.status);
    }
    console.error(
      'Mobile password reset unavailable:',
      error instanceof Error ? error.name : 'unknown_error',
    );
    return noStoreJson(
      {success: false, error: 'Password reset is temporarily unavailable. Please try again later.'},
      503,
    );
  }
}
