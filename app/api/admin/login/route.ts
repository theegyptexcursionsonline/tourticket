import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import User, { type IUser } from '@/lib/models/user';
import { signToken } from '@/lib/jwt';
import {
  ADMIN_PERMISSIONS,
  AdminPermission,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';
import { nextAdminLoginFailure } from '@/lib/security/adminLoginLockout';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import { PublicInputError, readBoundedJson } from '@/lib/security/publicInput';
import { canAccessMainAdminPortal } from '@/lib/auth/adminPortalScope';

const DUMMY_PASSWORD_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.8HtM5QX69q7OVWdfPQV3vF5wPfhJQmC';

function invalidResponse() {
  return NextResponse.json(
    { success: false, error: 'Invalid credentials' },
    { status: 401 },
  );
}

function lockedResponse(lockUntil: Date) {
  const retryAfter = Math.max(1, Math.ceil((lockUntil.getTime() - Date.now()) / 1000));
  return NextResponse.json(
    { success: false, error: 'Too many failed attempts. Try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

interface AdminPayloadSource {
  _id: unknown;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

async function recordFailedAttempt(user: IUser): Promise<Date | null> {
  const state = nextAdminLoginFailure(Number(user.adminLoginAttempts || 0));
  const lockUntil = state.lockUntil || null;

  user.adminLoginAttempts = state.attempts;
  user.adminLockUntil = lockUntil || undefined;
  await user.save({ validateBeforeSave: false });
  return lockUntil;
}

function buildAdminUserPayload(user: AdminPayloadSource, permissions: AdminPermission[]) {
  return {
    id: String(user._id),
    _id: String(user._id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    role: user.role,
    permissions,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await readBoundedJson<{
      email?: unknown;
      username?: unknown;
      password?: unknown;
    }>(request, 4_096);

    const rawIdentifier = typeof email === 'string' ? email : username;
    if (
      typeof password !== 'string'
      || password.length < 1
      || password.length > 1_024
      || typeof rawIdentifier !== 'string'
      || rawIdentifier.trim().length < 1
      || rawIdentifier.trim().length > 254
    ) {
      return NextResponse.json(
        { success: false, error: 'Email/username and password are required' },
        { status: 400 },
      );
    }

    const identifier = rawIdentifier.toLowerCase().trim();

    const envUsername = process.env.ADMIN_USERNAME?.toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD;

    if (
      process.env.NODE_ENV !== 'production' &&
      envUsername &&
      envPassword &&
      identifier === envUsername &&
      password === envPassword
    ) {
      const pseudoUser = {
        _id: 'env-admin',
        email: envUsername,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
      };
      const permissions = [...ADMIN_PERMISSIONS];

      const token = await signToken(
        {
          sub: pseudoUser._id,
          email: pseudoUser.email,
          given_name: pseudoUser.firstName,
          family_name: pseudoUser.lastName,
          role: pseudoUser.role,
          permissions,
          scope: 'admin',
        },
        { expiresIn: '8h' },
      );

      const response = NextResponse.json({
        success: true,
        user: buildAdminUserPayload(pseudoUser, permissions),
      });

      response.cookies.set('authToken', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 8,
        path: '/',
      });

      return response;
    }

    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'admin-login',
      subject: identifier,
      networkLimit: 20,
      subjectLimit: 8,
      windowMs: 15 * 60 * 1_000,
    });
    if (!rate.allowed) return lockedResponse(new Date(Date.now() + rate.retryAfterSeconds * 1_000));

    const user = await User.findOne({ email: identifier })
      .select('+password +adminLoginAttempts +adminLockUntil');
    if (!user) {
      // Keep missing-account and wrong-password response timing comparable.
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return invalidResponse();
    }

    if (user.adminLockUntil && user.adminLockUntil.getTime() > Date.now()) {
      return lockedResponse(user.adminLockUntil);
    }

    if (user.adminLockUntil) {
      user.adminLockUntil = undefined;
      user.adminLoginAttempts = 0;
    }

    if (!user.isActive) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return invalidResponse();
    }

    if (!user.password) {
      return invalidResponse();
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const lockUntil = await recordFailedAttempt(user);
      return lockUntil ? lockedResponse(lockUntil) : invalidResponse();
    }

    if (!user.role || user.role === 'customer') {
      return invalidResponse();
    }

    if (!canAccessMainAdminPortal(user.adminPortalScopes)) {
      return NextResponse.json(
        { success: false, error: 'This account is not assigned to this admin portal.' },
        { status: 403 },
      );
    }

    const permissions =
      user.permissions && user.permissions.length > 0
        ? [...user.permissions]
        : getDefaultPermissions(user.role);

    user.lastLoginAt = new Date();
    user.adminLoginAttempts = 0;
    user.adminLockUntil = undefined;
    if (!user.permissions || user.permissions.length === 0) {
      user.permissions = permissions;
    }

    await user.save({ validateBeforeSave: false });

    const token = await signToken(
      {
        sub: String(user._id),
        email: user.email,
        given_name: user.firstName,
        family_name: user.lastName,
        role: user.role,
        permissions,
        scope: 'admin',
      },
      { expiresIn: '8h' },
    );

    const response = NextResponse.json({
      success: true,
      user: buildAdminUserPayload(user, permissions),
    });

    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof PublicInputError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error('Admin login failed:', error instanceof Error ? error.message : 'Unknown error');

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during login',
      },
      { status: 500 },
    );
  }
}
