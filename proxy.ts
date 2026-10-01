import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { isInvitationAcceptPath } from './lib/routing/invitationRoute';
import {
  EDGE_VISITOR_HEADER,
  edgeConnectionAddress,
  runsOnNetlifyEdge,
  visitorSigningSecret,
  vouchForVisitor,
} from './lib/security/visitorAddress';
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

function adminSignInRewrite(request: NextRequest, forwarded: Headers) {
  const url = request.nextUrl.clone();
  url.pathname = ADMIN_SIGN_IN_PATH;
  const response = NextResponse.rewrite(url, { request: { headers: forwarded } });
  // The same URL renders the sign-in screen or the page depending on the
  // session, so no shared cache may keep either answer.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

// This proxy runs as Netlify's edge function: the only place that still sees the
// visitor's connection. The server functions behind it see the edge as their client, so
// every request it passes on carries the edge's signed word for the visitor
// (lib/security/visitorAddress.ts), and never a copy the request arrived with.
async function edgeVisitor(request: NextRequest): Promise<string | null> {
  const secret = visitorSigningSecret();
  const connection = edgeConnectionAddress();
  const vouched = await vouchForVisitor(request.headers, secret, connection).catch(() => null);
  if (!vouched && runsOnNetlifyEdge()) {
    warnUnvouchedVisitors(
      !secret
        ? 'no signing secret (ABUSE_LIMIT_HASH_SECRET or JWT_SECRET) is available to it'
        : !connection
          ? 'Netlify gave it no connection address'
          : 'it could not read or sign the connection address',
    );
  }
  return vouched;
}

let unvouchedVisitorsWarned = false;

/** Once per edge instance: without the edge's word, abuse limits and audit rows count every
 *  visitor as the edge itself. */
function warnUnvouchedVisitors(reason: string) {
  if (unvouchedVisitorsWarned) return;
  unvouchedVisitorsWarned = true;
  console.error(
    `[visitor-address] The site's edge cannot vouch for visitors' addresses (${reason}): `
    + 'abuse limits and audit rows count every visitor as the edge.',
  );
}

/** The request's headers as passed on: the edge's word for the visitor, never a copy the
 *  request arrived with. */
function forwardedHeaders(request: NextRequest, visitor: string | null): Headers {
  const headers = new Headers(request.headers);
  headers.delete(EDGE_VISITOR_HEADER);
  if (visitor) headers.set(EDGE_VISITOR_HEADER, visitor);
  return headers;
}

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const forwarded = forwardedHeaders(request, await edgeVisitor(request));

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
      return adminSignInRewrite(request, forwarded);
    }
    // Most admin pages are a public client shell whose private data comes from
    // cookie-authenticated, no-store API routes; the few that render data on
    // the server authorize themselves first (authorizeAdminPage) and render
    // per request. Do not force this HTML rewrite through a no-store response,
    // otherwise Netlify cannot serve the prerendered shells from the edge and
    // every first visit pays a cold server-render.
    return NextResponse.rewrite(url, { request: { headers: forwarded } });
  }

  // Admin pages are served directly at /admin/* on the dashboard hosts and on
  // localhost; apply the same session gate there.
  if (
    (isDashboardSubdomain || isLocalhost)
    && isAdminPagePath(pathname)
    && !shouldRenderAdminPage(request, pathname)
  ) {
    return adminSignInRewrite(request, forwarded);
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
    return NextResponse.next({ request: { headers: forwarded } });
  }

  // Skip for files with extensions (images, fonts, etc.)
  if (pathname.includes('.') && !pathname.endsWith('/')) {
    return NextResponse.next({ request: { headers: forwarded } });
  }

  // Apply next-intl middleware for all other routes
  // Handles locale detection, cookie persistence, and redirects. next-intl passes
  // the request on with a copy of the headers of the request it is given, so it is
  // given the forwarded headers (and no body: it reads only the URL, headers and
  // cookies, and the original request's method and body still reach the page).
  return intlMiddleware(new NextRequest(request.url, { headers: forwarded }));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
