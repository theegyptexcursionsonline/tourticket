import { NextRequest, NextResponse } from 'next/server';
import { authenticateFirebaseUser, formatUserForClient } from '@/lib/firebase/authHelpers';

/**
 * GET /api/auth/me
 * Get current user information
 * Verifies Firebase ID token and returns user data from MongoDB
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate Firebase user
    const authResult = await authenticateFirebaseUser(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication failed' },
        { status: authResult.statusCode || 401 }
      );
    }

    // Format user data for response
    const userData = formatUserForClient(authResult.user);

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user information' },
      { status: 500 }
    );
  }
}
