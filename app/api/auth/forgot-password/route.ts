import { NextRequest, NextResponse } from 'next/server';
import { managementClient } from '@/lib/auth0';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Check if user exists in Auth0
    try {
      const users = await managementClient.getUsersByEmail(email);
      
      if (!users || users.length === 0) {
        // For security, we don't reveal if the email exists or not
        return NextResponse.json({
          success: true,
          message: 'If an account with this email exists, you will receive a password reset email shortly.'
        });
      }

      const user = users[0];

      // Create password change ticket
      const ticket = await managementClient.createPasswordChangeTicket({
        user_id: user.user_id!,
        result_url: `${process.env.AUTH0_BASE_URL}/login?message=Password reset successful! Please log in with your new password.`,
        // Optional: customize the email
        mark_email_as_verified: false,
        includeEmailInRedirect: false,
      });

      return NextResponse.json({
        success: true,
        message: 'Password reset email sent! Please check your inbox and follow the instructions.',
        ticket_url: ticket.ticket // This is for debugging - don't expose in production
      });

    } catch (error: any) {
      console.error('Error creating password reset ticket:', error);
      
      // For security, we don't reveal specific errors
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset email shortly.'
      });
    }

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}