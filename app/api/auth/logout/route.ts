import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // For stateless JWT, server-side logout is primarily about clearing cookies if they are used.
    // If tokens are stored in localStorage, the client handles their removal.
    // This endpoint can be used for any server-side cleanup if necessary.

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear the authToken cookie
    response.cookies.set('authToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}