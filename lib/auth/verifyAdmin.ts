// lib/auth/verifyAdmin.ts
// Simple admin authentication helper for API routes

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { AdminPermission } from '@/lib/constants/adminPermissions';

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
function permissionForPath(pathname: string): AdminPermission | null {
  if (pathname.includes('/bookings') || pathname.includes('/manifests')) return 'manageBookings';
  if (pathname.includes('/reports')) return 'manageReports';
  if (pathname.includes('/discounts')) return 'manageDiscounts';
  if (
    pathname.includes('/tours') ||
    pathname.includes('/availability') ||
    pathname.includes('/special-offers')
  ) return 'manageTours';
  if (
    pathname.includes('/blog') ||
    pathname.includes('/reviews') ||
    pathname.includes('/destinations') ||
    pathname.includes('/attraction-pages') ||
    pathname.includes('/hero-settings') ||
    pathname.includes('/translate')
  ) return 'manageContent';
  return null;
}

export async function verifyAdmin(request?: NextRequest): Promise<AdminInfo | NextResponse> {
  try {
    if (!request) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const permission = permissionForPath(request.nextUrl.pathname);
    if (!permission) {
      return NextResponse.json(
        { success: false, error: 'No permission policy is configured for this route' },
        { status: 403 }
      );
    }

    const auth = await requireAdminAuth(request, { permissions: [permission] });
    if (auth instanceof NextResponse) return auth;

    return {
      id: auth.userId,
      email: auth.email || '',
      name: auth.email || 'Admin',
      role: auth.role,
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
