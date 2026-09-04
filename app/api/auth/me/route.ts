import { NextRequest, NextResponse } from 'next/server';
import { authenticateCustomerSession, formatCustomerForClient } from '@/lib/auth/customerSession';

/**
 * GET /api/auth/me
 * Get current user information
 * Verifies the platform-owned customer session and returns MongoDB user data.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateCustomerSession(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication failed' },
        { status: authResult.statusCode || 401 }
      );
    }

    // Format user data for response
    const userData = formatCustomerForClient(authResult.user);

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error: unknown) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user information' },
      { status: 500 }
    );
  }
}
