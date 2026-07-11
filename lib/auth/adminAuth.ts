import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import {
  AdminPermission,
  AdminRole,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';

export interface AdminAuthContext {
  userId: string;
  email?: string;
  role: AdminRole;
  permissions: AdminPermission[];
}

interface RequireAdminOptions {
  permissions?: AdminPermission[];
  requireAll?: boolean;
}

const UNAUTHORIZED_RESPONSE = NextResponse.json(
  { success: false, error: 'Admin authorization required' },
  { status: 401 },
);

const FORBIDDEN_RESPONSE = NextResponse.json(
  { success: false, error: 'You do not have permission to perform this action.' },
  { status: 403 },
);

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
    return UNAUTHORIZED_RESPONSE;
  }

  // Cookie authentication is convenient for same-origin admin forms/uploads,
  // but state-changing requests must also prove they came from this origin.
  if (!bearerToken && cookieToken && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).host !== request.nextUrl.host) {
      return FORBIDDEN_RESPONSE;
    }
  }

  const payload = await verifyToken(token);
  if (!payload || payload.scope !== 'admin') {
    return UNAUTHORIZED_RESPONSE;
  }

  const role = (payload.role as AdminRole) || 'customer';
  const permissionsFromToken = Array.isArray(payload.permissions)
    ? (payload.permissions as AdminPermission[])
    : getDefaultPermissions(role);

  const authContext: AdminAuthContext = {
    userId: String(payload.sub),
    email: typeof payload.email === 'string' ? payload.email : undefined,
    role,
    permissions: permissionsFromToken,
  };

  const { permissions = [], requireAll = true } = options;
  if (permissions.length === 0) {
    return authContext;
  }

  const hasPermissions = requireAll
    ? permissions.every((perm) => authContext.permissions.includes(perm) || role === 'super_admin')
    : permissions.some((perm) => authContext.permissions.includes(perm) || role === 'super_admin');

  if (!hasPermissions) {
    return FORBIDDEN_RESPONSE;
  }

  return authContext;
}
