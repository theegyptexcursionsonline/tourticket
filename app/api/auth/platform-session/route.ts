import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { verifyToken } from '@/lib/jwt';
import { getDefaultPermissions } from '@/lib/constants/adminPermissions';

/**
 * GET /api/auth/platform-session
 *
 * Restores a session that was established against the platform's own
 * credential store (`/api/auth/login`, `/api/auth/signup`) rather than the
 * external identity provider.
 *
 * `/api/auth/me` verifies a provider ID token and cannot answer for these
 * sessions, so without this route a customer who signed in while the provider
 * was unavailable would be silently signed out on their next page load.
 *
 * Reads only the caller's own record from their own `authToken` cookie. It
 * grants nothing: the role and permissions returned are whatever the stored
 * user already has, and every failure path is a bare 401 that distinguishes
 * nothing about the account.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
  }

  let subject: string | undefined;
  try {
    const payload = (await verifyToken(token)) as { sub?: unknown } | null;
    if (payload && typeof payload.sub === 'string' && payload.sub.length > 0) {
      subject = payload.sub;
    }
  } catch {
    // An expired, forged or malformed token is simply not a session.
    subject = undefined;
  }

  if (!subject) {
    return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
  }

  try {
    await dbConnect();
    const user = await User.findById(subject);

    // A deleted or deactivated account must fail closed, never fall through to
    // a partially populated session built from token claims alone.
    if (!user || user.isActive === false) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    const role = user.role || 'customer';
    const permissions =
      user.permissions && user.permissions.length > 0 ? user.permissions : getDefaultPermissions(role);

    return NextResponse.json({
      success: true,
      user: {
        id: String(user._id),
        _id: String(user._id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        role,
        permissions,
        authProvider: user.authProvider || 'jwt',
        emailVerified: Boolean(user.emailVerified),
      },
    });
  } catch (error) {
    console.error('Platform session lookup failed:', error);
    // A failed read is not an empty state: report the failure so the client can
    // show a designed error rather than rendering a signed-out page.
    return NextResponse.json(
      { success: false, error: 'Could not restore your session' },
      { status: 503 },
    );
  }
}
