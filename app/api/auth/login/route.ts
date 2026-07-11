import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';
import { getDefaultPermissions } from '@/lib/constants/adminPermissions';
import { nextAdminLoginFailure } from '@/lib/security/adminLoginLockout';

const DUMMY_PASSWORD_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.8HtM5QX69q7OVWdfPQV3vF5wPfhJQmC';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const { email, password } = await request.json();

    // --- Basic Validation ---
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // --- Find User in Local DB ---
    // Explicitly select the password field as it's excluded by default in the schema
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail })
      .select('+password +adminLoginAttempts +adminLockUntil');

    if (!user || !user.password) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'This account is inactive' }, { status: 403 });
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
    const effectiveRole = (user as any).role || 'customer';
    const assignedPermissions =
      (user as any).permissions && (user as any).permissions.length > 0
        ? (user as any).permissions
        : getDefaultPermissions(effectiveRole);

    const userPayload = {
      id: (user._id as any).toString(),
      _id: (user._id as any).toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      role: effectiveRole,
      permissions: assignedPermissions,
    };

    // --- Generate JWT ---
    const token = await signToken({
      sub: (user._id as any).toString(), // Convert ObjectId to string
      email: user.email,
      given_name: user.firstName,
      family_name: user.lastName,
      iat: Math.floor(Date.now() / 1000),
      role: effectiveRole,
      permissions: assignedPermissions,
      scope: 'customer',
    });

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

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}
