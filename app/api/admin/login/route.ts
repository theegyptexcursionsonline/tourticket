// app/api/admin/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Get the expected credentials from environment variables
    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    // Check if both username and password match
    if (username === expectedUsername && password === expectedPassword) {
      // If they match, send back a success response with the token
      const token = 'secret-auth-token-for-admin-access';
      return NextResponse.json({ success: true, token });
    } else {
      // If they don't match, send an unauthorized error
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}