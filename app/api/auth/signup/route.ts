import { NextRequest, NextResponse } from 'next/server';
import { managementClient } from '@/lib/auth0';

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, password } = await request.json();

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one lowercase letter, one uppercase letter, and one number' },
        { status: 400 }
      );
    }

    // Check if user already exists
    try {
      const existingUsers = await managementClient.getUsersByEmail(email);
      if (existingUsers && existingUsers.length > 0) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
    } catch (error: any) {
      // If error is 404, user doesn't exist, which is what we want
      if (error.statusCode !== 404) {
        console.error('Error checking existing user:', error);
        return NextResponse.json(
          { error: 'Failed to check user existence' },
          { status: 500 }
        );
      }
    }

    // Create user in Auth0
    const newUser = await managementClient.createUser({
      connection: 'Username-Password-Authentication', // Default Auth0 database connection
      email: email.toLowerCase(),
      password,
      name: `${firstName} ${lastName}`,
      given_name: firstName,
      family_name: lastName,
      email_verified: false,
      user_metadata: {
        firstName,
        lastName,
      },
    });

    // Prepare user data for response
    const userData = {
      id: newUser.user_id,
      email: newUser.email,
      name: newUser.name,
      firstName: newUser.given_name || firstName,
      lastName: newUser.family_name || lastName,
      picture: newUser.picture,
      emailVerified: newUser.email_verified,
      createdAt: newUser.created_at,
    };

    return NextResponse.json({
      success: true,
      user: userData,
      message: 'Account created successfully! Please check your email to verify your account.'
    });

  } catch (error: any) {
    console.error('Signup error:', error);
    
    if (error.statusCode === 409) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    if (error.message?.includes('PasswordStrengthError')) {
      return NextResponse.json(
        { error: 'Password does not meet strength requirements' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}