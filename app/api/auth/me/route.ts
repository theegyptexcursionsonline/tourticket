import { NextRequest, NextResponse } from 'next/server';
import { authenticationClient } from '@/lib/auth0';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('auth0_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No authentication token found' },
        { status: 401 }
      );
    }

    // Get user profile from Auth0
    const userProfile = await authenticationClient.users.getInfo(accessToken);

    // Prepare user data
    const userData = {
      id: userProfile.sub,
      email: userProfile.email,
      name: userProfile.name,
      firstName: userProfile.given_name || userProfile.name?.split(' ')[0] || '',
      lastName: userProfile.family_name || userProfile.name?.split(' ').slice(1).join(' ') || '',
      picture: userProfile.picture,
      emailVerified: userProfile.email_verified,
      createdAt: userProfile.updated_at,
    };

    return NextResponse.json({
      success: true,
      user: userData,
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    
    if (error.statusCode === 401) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get user information' },
      { status: 500 }
    );
  }
}