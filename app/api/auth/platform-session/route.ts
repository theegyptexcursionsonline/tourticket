import { NextRequest, NextResponse } from 'next/server';
import { authenticateCustomerSession, formatCustomerForClient } from '@/lib/auth/customerSession';

/**
 * GET /api/auth/platform-session
 *
 * Restores a session that was established against the platform's own
 * credential store (`/api/auth/login`, `/api/auth/signup`).
 *
 * Reads only the caller's own record from their own `authToken` cookie. It
 * grants nothing: the role and permissions returned are whatever the stored
 * user already has, and every failure path is a bare 401 that distinguishes
 * nothing about the account.
 */
export async function GET(request: NextRequest) {
  try {
    const authentication = await authenticateCustomerSession(request);
    if (!authentication.success) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: formatCustomerForClient(authentication.user),
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
