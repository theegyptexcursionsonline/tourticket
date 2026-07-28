import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { verifyToken } from '@/lib/jwt';
import User from '@/lib/models/user';
import {
  AdminPermission,
  AdminRole,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';
import { canAccessMainAdminPortal } from '@/lib/auth/adminPortalScope';
import {
  ADMIN_ENROLLMENT_SCOPE,
  ADMIN_SESSION_SCOPE,
} from '@/lib/auth/adminSession';

export interface AdminAuthContext {
  userId: string;
  email?: string;
  role: AdminRole;
  permissions: AdminPermission[];
  twoFactorEnabled: boolean;
  twoFactorRecoveryPending?: boolean;
}

interface RequireAdminOptions {
  permissions?: AdminPermission[];
  requireAll?: boolean;
  allowTwoFactorEnrollment?: boolean;
}

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: 'Admin authorization required' },
    { status: 401 },
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    { success: false, error: 'You do not have permission to perform this action.' },
    { status: 403 },
  );
}

function twoFactorSetupRequiredResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'Two-factor authentication setup is required before using the admin portal.',
      code: 'TWO_FACTOR_SETUP_REQUIRED',
    },
    { status: 403 },
  );
}

function recoveryAcknowledgementRequiredResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'Save and confirm your recovery codes before using the admin portal.',
      code: 'TWO_FACTOR_RECOVERY_ACK_REQUIRED',
    },
    { status: 403 },
  );
}

function serviceUnavailableResponse() {
  return NextResponse.json(
    { success: false, error: 'Admin authorization is temporarily unavailable' },
    { status: 503 },
  );
}

export async function requireAdminAuth(
  request: NextRequest,
  options: RequireAdminOptions = {},
): Promise<AdminAuthContext | NextResponse> {
  const authHeader = request.headers.get('authorization');
  const presentedBearer = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '').trim()
    : '';
  // Older admin components still use the context's `token` as a readiness
  // flag. It now contains this non-secret sentinel; authentication remains
  // exclusively in the httpOnly cookie.
  const bearerToken = presentedBearer === 'cookie-session' ? '' : presentedBearer;
  const cookieToken = request.cookies.get('authToken')?.value?.trim() || '';
  const token = bearerToken || cookieToken;
  if (!token) {
    return unauthorizedResponse();
  }

  // Cookie authentication is convenient for same-origin admin forms/uploads,
  // but state-changing requests must also prove they came from this origin.
  if (!bearerToken && cookieToken && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    // Behind Netlify's proxy, request.nextUrl.host is the internal function
    // host — comparing Origin against it rejected EVERY legitimate admin
    // write in production ("You do not have permission…" on status changes,
    // cancel and refund). The public host arrives in x-forwarded-host, which
    // the edge sets and a cross-site attacker's browser cannot spoof, so the
    // CSRF property is preserved.
    const publicHost =
      request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
      request.headers.get('host') ||
      request.nextUrl.host;
    let sameOrigin = false;
    try {
      sameOrigin = Boolean(origin && new URL(origin).host === publicHost);
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) {
      return forbiddenResponse();
    }
  }

  const payload = await verifyToken(token);
  const scope = payload?.scope;
  const enrollmentSession = scope === ADMIN_ENROLLMENT_SCOPE;
  if (!payload || (scope !== ADMIN_SESSION_SCOPE && !enrollmentSession)) {
    return unauthorizedResponse();
  }

  const userId = String(payload.sub || '');
  if (userId === 'env-admin') {
    if (process.env.NODE_ENV === 'production') {
      return unauthorizedResponse();
    }

    const authContext: AdminAuthContext = {
      userId,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: 'super_admin',
      permissions: getDefaultPermissions('super_admin'),
      twoFactorEnabled: true,
      twoFactorRecoveryPending: false,
    };

    const { permissions = [], requireAll = true } = options;
    const hasPermissions = requireAll
      ? permissions.every((permission) => authContext.permissions.includes(permission))
      : permissions.some((permission) => authContext.permissions.includes(permission));

    return permissions.length === 0 || hasPermissions ? authContext : forbiddenResponse();
  }

  if (!mongoose.isValidObjectId(userId)) {
    return unauthorizedResponse();
  }

  // JWTs prove that a login happened, but current database state remains the
  // authority. This makes deactivation, demotion and permission revocation
  // effective immediately instead of leaving an eight-hour authorization gap.
  let currentUser;
  try {
    await dbConnect();
    currentUser = await User.findOne({
      _id: userId,
      isActive: true,
      role: { $ne: 'customer' },
    })
      .select('email role permissions adminPortalScopes twoFactorEnabled twoFactorRecoveryPending')
      .lean();
  } catch (error) {
    console.error(
      'Admin authorization lookup failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return serviceUnavailableResponse();
  }

  if (!currentUser) {
    return unauthorizedResponse();
  }

  if (!canAccessMainAdminPortal(currentUser.adminPortalScopes)) {
    return forbiddenResponse();
  }

  const recoveryPending = Boolean(currentUser.twoFactorRecoveryPending);
  if (enrollmentSession && currentUser.twoFactorEnabled && !recoveryPending) {
    return unauthorizedResponse();
  }

  if (!currentUser.twoFactorEnabled && !options.allowTwoFactorEnrollment) {
    return twoFactorSetupRequiredResponse();
  }
  if (recoveryPending && !options.allowTwoFactorEnrollment) {
    return recoveryAcknowledgementRequiredResponse();
  }

  const role = currentUser.role as AdminRole;
  const permissionsFromDatabase =
    Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0
      ? (currentUser.permissions as AdminPermission[])
      : getDefaultPermissions(role);

  const authContext: AdminAuthContext = {
    userId,
    email: currentUser.email,
    role,
    permissions: enrollmentSession ? [] : permissionsFromDatabase,
    twoFactorEnabled: Boolean(currentUser.twoFactorEnabled),
    twoFactorRecoveryPending: recoveryPending,
  };

  const { permissions = [], requireAll = true } = options;
  if (permissions.length === 0) {
    return authContext;
  }

  const hasPermissions = requireAll
    ? permissions.every((perm) => authContext.permissions.includes(perm) || role === 'super_admin')
    : permissions.some((perm) => authContext.permissions.includes(perm) || role === 'super_admin');

  if (!hasPermissions) {
    return forbiddenResponse();
  }

  return authContext;
}
