import type { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyToken } from '@/lib/jwt';
import User, { type IUser } from '@/lib/models/user';
import { PLATFORM_SESSION_SENTINEL } from '@/lib/auth/customerSessionToken';
import { getDefaultPermissions } from '@/lib/constants/adminPermissions';

export type CustomerAuthenticationResult =
  | {
      success: true;
      user: IUser;
      error?: never;
      statusCode?: never;
    }
  | {
      success: false;
      error: string;
      statusCode: number;
      user?: never;
    };

function rejected(error = 'Invalid or expired customer session'): CustomerAuthenticationResult {
  return { success: false, error, statusCode: 401 };
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

function requiresExplicitOrigin(request: NextRequest): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase());
}

async function userForToken(token: string): Promise<IUser | null> {
  const payload = await verifyToken(token);
  const subject = typeof payload?.sub === 'string' ? payload.sub : '';

  if (
    payload?.scope !== 'customer'
    || !subject
    || !/^[a-f\d]{24}$/i.test(subject)
  ) {
    return null;
  }

  await dbConnect();
  const user = await User.findOne({ _id: subject, isActive: true });
  if (!user || user.role !== 'customer') return null;
  return user as IUser;
}

/**
 * Authenticate a storefront customer through the platform-owned JWT.
 *
 * A real Bearer token is explicit authority and never falls back to a cookie
 * when it is invalid. Restored browser sessions use the exact internal
 * `platform-session` sentinel; that sentinel intentionally selects the
 * httpOnly cookie and is not itself accepted as a credential.
 *
 * Cookie-backed mutations require an explicit same-origin `Origin` header in
 * addition to the cookie's SameSite policy. Read requests accept an omitted
 * Origin (normal browser navigation) but reject a declared foreign origin.
 */
export async function authenticateCustomerSession(
  request: NextRequest,
): Promise<CustomerAuthenticationResult> {
  const authorization = request.headers.get('authorization');

  if (authorization) {
    if (!authorization.startsWith('Bearer ')) return rejected();
    const bearer = authorization.slice(7).trim();
    if (!bearer) return rejected();

    if (bearer !== PLATFORM_SESSION_SENTINEL) {
      const user = await userForToken(bearer);
      return user ? { success: true, user } : rejected();
    }
  }

  const sessionToken = request.cookies.get('authToken')?.value;
  if (!sessionToken) return rejected('Authentication required');

  const origin = request.headers.get('origin');
  if (!isSameOrigin(request) || (requiresExplicitOrigin(request) && !origin)) {
    return rejected();
  }

  const user = await userForToken(sessionToken);
  return user ? { success: true, user } : rejected();
}

export function formatCustomerForClient(user: IUser) {
  const role = user.role || 'customer';
  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    role,
    permissions: user.permissions && user.permissions.length > 0
      ? user.permissions
      : getDefaultPermissions(role),
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    authProvider: user.authProvider,
    createdAt: user.createdAt,
  };
}
