import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { assertJwtSecretConfigured } from '@/lib/auth/jwtConfiguration';

const READINESS_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * Read-only capability probe for the independent uptime monitor.
 *
 * It exercises the prerequisites that made customer sign-in fail during the
 * identity incident without accepting a credential, minting a token, changing
 * an account, or disclosing whether any particular identity exists.
 */
export async function GET() {
  try {
    assertJwtSecretConfigured();
    await dbConnect();
    const passwordCustomer = await User.exists({
      role: 'customer',
      isActive: true,
      password: { $type: 'string' },
    });

    return new NextResponse(null, {
      status: passwordCustomer ? 204 : 503,
      headers: READINESS_HEADERS,
    });
  } catch {
    console.error('Customer sign-in readiness check failed');
    return new NextResponse(null, { status: 503, headers: READINESS_HEADERS });
  }
}
