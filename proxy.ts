import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isInvitationAcceptPath } from './lib/routing/invitationRoute';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SIGN_IN_PATH,
  hasPlausibleAdminSession,
  isAdminPagePath,
  isAdminSignInPath,
} from './lib/routing/adminSessionGate';

const intlMiddleware = createMiddleware(routing);

// Admin pages are only rendered for requests that carry a plausible admin
// session; everything else gets the data-free sign-in screen. The page and API
// guards remain the authority (see lib/routing/adminSessionGate.ts).
function shouldRenderAdminPage(request: NextRequest, adminPathname: string): boolean {
  return (
    isAdminSignInPath(adminPathname)
    || hasPlausibleAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)
  );
}

function adminSignInRewrite(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = ADMIN_SIGN_IN_PATH;
  const response = NextResponse.rewrite(url);
  // The same URL renders the sign-in screen or the page depending on the
  // session, so no shared cache may keep either answer.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  const isDashboardSubdomain =
    hostname.startsWith('dashboard.') ||
    hostname.startsWith('dashboard2.') ||
    hostname.startsWith('admin.');

  // Netlify executes this proxy before Next.js config rewrites. Preserve old
  // shared/search links while sending storefront visitors to the canonical
  // root URL. Dashboard paths such as /tours/new are application routes, not
  // legacy public-tour links.
  const legacyTourMatch = pathname.match(/^\/tours\/([^/]+)\/?$/);
  if (!isDashboardSubdomain && legacyTourMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/${legacyTourMatch[1]}`;
    return NextResponse.redirect(url, 308);
  }

  const normalizedHostname = hostname.split(':')[0];
  const isLocalhost =
    normalizedHostname === 'localhost' ||
    normalizedHostname === '127.0.0.1' ||
    normalizedHostname === '0.0.0.0' ||
    normalizedHostname === '[::1]';

  // Subdomain routing: dashboard/dashboard2/admin.* → /admin
  // Paths that must resolve at the root (NOT be rewritten under /admin)
  // even when served from a dashboard subdomain. Keep /monitoring as a
  // passthrough for cached clients that still post to the old Sentry tunnel.
  const dashboardPassthroughPaths = [
    '/admin',
    '/api',
    '/_next',
    '/monitoring',
    '/sentry-example-page',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.json',
  ];

  const isDashboardPassthrough =
    isInvitationAcceptPath(pathname) ||
    dashboardPassthroughPaths.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    );

  if (isDashboardSubdomain && !isDashboardPassthrough) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
    if (!shouldRenderAdminPage(request, url.pathname)) {
      return adminSignInRewrite(request);
    }
    // Most admin pages are a public client shell whose private data comes from
    // cookie-authenticated, no-store API routes; the few that render data on
    // the server authorize themselves first (authorizeAdminPage) and render
    // per request. Do not force this HTML rewrite through a no-store response,
    // otherwise Netlify cannot serve the prerendered shells from the edge and
    // every first visit pays a cold server-render.
    return NextResponse.rewrite(url);
  }

  // Admin pages are served directly at /admin/* on the dashboard hosts and on
  // localhost; apply the same session gate there.
  if (
    (isDashboardSubdomain || isLocalhost)
    && isAdminPagePath(pathname)
    && !shouldRenderAdminPage(request, pathname)
  ) {
    return adminSignInRewrite(request);
  }

  // Redirect main domain /admin to dashboard subdomain
  if (!isLocalhost && !isDashboardSubdomain && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
    const adminPath = pathname.replace(/^\/admin/, '') || '/';
    const dashboardUrl = new URL(`https://dashboard2.egypt-excursionsonline.com${adminPath}`);
    dashboardUrl.search = request.nextUrl.search;
    return NextResponse.redirect(dashboardUrl);
  }

  // Routes that should NOT go through locale middleware
  const skipLocaleRoutes = [
    '/admin',
    '/api',
    '/_next',
    '/favicon.ico',
    '/images',
    '/uploads',
    '/static',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.json',
    '/monitoring',
    '/sentry-example-page',
  ];

  const shouldSkipLocale = skipLocaleRoutes.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );

  if (shouldSkipLocale) {
    return NextResponse.next();
  }

  // Skip for files with extensions (images, fonts, etc.)
  if (pathname.includes('.') && !pathname.endsWith('/')) {
    return NextResponse.next();
  }

  // Apply next-intl middleware for all other routes
  // Handles locale detection, cookie persistence, and redirects
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
