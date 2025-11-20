// app/api/admin/accept-invitation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token and password are required.' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long.' },
        { status: 400 },
      );
    }

    // Find user with this invitation token
    const user = await User.findOne({
      invitationToken: token,
      invitationExpires: { $gt: new Date() }, // Token not expired
    }).select('+invitationToken +invitationExpires +password');

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired invitation token.',
        },
        { status: 400 },
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user: set password, activate account, clear invitation token
    user.password = hashedPassword;
    user.isActive = true;
    user.invitationToken = undefined;
    user.invitationExpires = undefined;
    user.requirePasswordChange = false;
    
    // Bypass validation since we're just updating password and flags
    await user.save({ validateBeforeSave: false });

    return NextResponse.json({
      success: true,
      message: 'Account activated successfully. You can now log in.',
      email: user.email,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to accept invitation. Please try again.',
      },
      { status: 500 },
    );
  }
}

// GET endpoint to verify token validity
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required.' },
        { status: 400 },
      );
    }

    // Find user with this invitation token
    const user = await User.findOne({
      invitationToken: token,
      invitationExpires: { $gt: new Date() },
    }).select('firstName lastName email role +invitationExpires');

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired invitation token.',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        expiresAt: user.invitationExpires,
      },
    });
  } catch (error) {
    console.error('Error verifying invitation token:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify token. Please try again.',
      },
      { status: 500 },
    );
  }
}

