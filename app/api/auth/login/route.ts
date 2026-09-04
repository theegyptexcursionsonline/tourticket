import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';
import { getDefaultPermissions } from '@/lib/constants/adminPermissions';
import { nextAdminLoginFailure } from '@/lib/security/adminLoginLockout';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import { normalizeEmail, PublicInputError, readBoundedJson } from '@/lib/security/publicInput';
import { assertJwtSecretConfigured } from '@/lib/auth/jwtConfiguration';

const DUMMY_PASSWORD_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.8HtM5QX69q7OVWdfPQV3vF5wPfhJQmC';

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
export async function HEAD() {
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

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await readBoundedJson<{ email?: unknown; password?: unknown }>(request, 4_096);

    // --- Basic Validation ---
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || typeof password !== 'string' || password.length < 1 || password.length > 1_024) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'customer-login',
      subject: normalizedEmail,
      networkLimit: 30,
      subjectLimit: 10,
      windowMs: 15 * 60 * 1_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
      );
    }

    // --- Find User in Local DB ---
    // Explicitly select the password field as it's excluded by default in the schema
    const user = await User.findOne({ email: normalizedEmail })
      .select('+password +adminLoginAttempts +adminLockUntil');

    if (!user || !user.password || user.role !== 'customer') {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    if (user.adminLockUntil && user.adminLockUntil.getTime() > Date.now()) {
      const retryAfter = Math.max(1, Math.ceil((user.adminLockUntil.getTime() - Date.now()) / 1000));
      return NextResponse.json({ error: 'Too many failed attempts. Try again later.' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
    }

    // --- Compare Passwords ---
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const state = nextAdminLoginFailure(Number(user.adminLoginAttempts || 0));
      user.adminLoginAttempts = state.attempts;
      user.adminLockUntil = state.lockUntil;
      await user.save({ validateBeforeSave: false });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    user.adminLoginAttempts = 0;
    user.adminLockUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
    
    // --- Prepare User Data for Token and Response ---
    const effectiveRole = user.role || 'customer';
    const assignedPermissions =
      user.permissions && user.permissions.length > 0
        ? user.permissions
        : getDefaultPermissions(effectiveRole);

    const userPayload = {
      id: String(user._id),
      _id: String(user._id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: effectiveRole,
      permissions: assignedPermissions,
    };

    // --- Generate JWT ---
    const token = await signToken(
      {
        sub: String(user._id), // Convert ObjectId to string
        email: user.email,
        given_name: user.firstName,
        family_name: user.lastName,
        iat: Math.floor(Date.now() / 1000),
        role: effectiveRole,
        permissions: assignedPermissions,
        scope: 'customer',
      },
      { expiresIn: '7d' },
    );

    // --- Success Response ---
    const response = NextResponse.json({
      success: true,
      message: 'Login successful!',
      token,
      user: userPayload,
    });
    
    // Set authToken cookie for API authentication
    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days for regular users
      path: '/',
    });
    
    return response;

  } catch (error: unknown) {
    if (error instanceof PublicInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Login Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}
