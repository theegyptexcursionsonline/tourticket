import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { verifyToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Verify JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedPayload = await verifyToken(token);

    if (!decodedPayload || !decodedPayload.sub) {
      return NextResponse.json({ error: 'Not authenticated: Invalid token' }, { status: 401 });
    }

    const userId = decodedPayload.sub as string;

    // Parse request body
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 });
    }

    // Find user with password field (it's excluded by default)
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash new password
    const saltRounds = 12; // Higher than the default 10 for better security
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await User.findByIdAndUpdate(
      userId,
      { password: hashedNewPassword },
      { runValidators: true }
    );

    return NextResponse.json({ 
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'ValidationError') {
        return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
      }
      
      if (error.name === 'CastError') {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}