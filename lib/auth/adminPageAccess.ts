import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, type AdminAuthContext } from '@/lib/auth/adminAuth';
import type { AdminPermission } from '@/lib/constants/adminPermissions';
import type { AdminPageDenial } from '@/lib/auth/adminPageDenial';

export type AdminPageAccess =
  | { granted: true; auth: AdminAuthContext }
  | { granted: false; denial: AdminPageDenial };

// Only used to give the reconstructed request a URL; nothing is fetched from it.
const PAGE_REQUEST_URL = 'https://admin-page.invalid/admin';

function denialForStatus(status: number): AdminPageDenial {
  if (status === 401) return 'sign-in-required';
  if (status === 403) return 'forbidden';
  return 'unavailable';
}

/**
 * Authorizes a server-rendered admin page.
 *
 * Next renders a layout and its page in parallel, so the admin layout's
 * sign-in screen is NOT an authorization boundary: a server page that reads
 * the database streams that data into its response before the browser ever
 * shows the sign-in form, and `curl` receives all of it. Any admin page that
 * reads data must therefore make this its first await and render nothing
 * private unless access is granted.
 *
 * It runs the exact authority every admin API uses — a signed session, the
 * account's current database state, mandatory two-factor, portal scope and
 * the page's permissions — so a page can never be more permissive than the
 * API behind it. Any failure to decide fails closed.
 */
export async function authorizeAdminPage(
  permissions: AdminPermission[],
): Promise<AdminPageAccess> {
  // Outside the try: reading request headers is what opts the page into
  // per-request rendering, and Next signals that with an error it must see.
  const incoming = await headers();
  try {
    const request = new NextRequest(PAGE_REQUEST_URL, {
      method: 'GET',
      headers: incoming,
    });
    const result = await requireAdminAuth(request, { permissions });
    if (result instanceof NextResponse) {
      return { granted: false, denial: denialForStatus(result.status) };
    }
    return { granted: true, auth: result };
  } catch (error) {
    console.error(
      'Admin page authorization failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return { granted: false, denial: 'unavailable' };
  }
}
