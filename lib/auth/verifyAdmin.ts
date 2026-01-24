// lib/auth/verifyAdmin.ts
// Simple admin authentication helper for API routes

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';

export interface AdminInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Verify that the current request is from an authenticated admin user.
 * 
 * Usage:
 * ```typescript
 * export async function GET() {
 *   const auth = await verifyAdmin();
 *   if (auth instanceof NextResponse) return auth; // Returns 401 error
 *   // auth is now AdminInfo with id, email, name, role
 * }
 * ```
 * 
 * @returns AdminInfo if authenticated, NextResponse error if not
 */
export async function verifyAdmin(): Promise<AdminInfo | NextResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const role = payload.role as string;
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: (payload.name as string) || (payload.email as string) || 'Admin',
      role: role,
    };
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * Helper type guard to check if auth result is an error response
 */
export function isAuthError(result: AdminInfo | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
