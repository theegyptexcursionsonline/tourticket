import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/user';
import bcrypt from 'bcryptjs';
import { authenticateCustomerSession } from '@/lib/auth/customerSession';

export async function POST(request: NextRequest) {
  try {
    const authentication = await authenticateCustomerSession(request);
    if (!authentication.success) return NextResponse.json({ error: authentication.error }, { status: authentication.statusCode });
    const userId = String(authentication.user._id);
    const user = await User.findOne({ _id: userId, isActive: true }).select('+password');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
    if (!user.password) {
      return NextResponse.json({
        code: 'PASSWORD_SETUP_REQUIRED',
        error: 'Set your password through “Forgot password?” before changing it here.',
      }, { status: 409 });
    }

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

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password as string);

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
      if ((error as Error).name === 'ValidationError') {
        return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
      }
      
      if ((error as Error).name === 'CastError') {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
