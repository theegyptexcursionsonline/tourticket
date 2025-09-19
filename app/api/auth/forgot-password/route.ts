import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { signToken } from '@/lib/jwt';
// Assuming you have a mail sending utility like this one.
// You may need to create or adjust this file.
import { sendPasswordResetEmail } from '@/lib/mailgun';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const { email } = await request.json();

    // --- Basic Validation ---
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // --- Find User in Local DB ---
    const user = await User.findOne({ email });

    // For security, always return a generic success message
    // whether the user exists or not.
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    // --- Generate a short-lived password reset token (e.g., expires in 15 minutes) ---
    const resetToken = await signToken(
      { sub: user._id, email: user.email },
      { expiresIn: '15m' }
    );

    // --- Construct the reset URL ---
    // Note: You will need to create a page at '/reset-password'
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${resetToken}`;

    // --- Send the password reset email ---
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Even if email fails, don't expose the error to the client
      // for security reasons. The initial success message is sufficient.
    }
    
    return NextResponse.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.'
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    // Return a generic error message
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}