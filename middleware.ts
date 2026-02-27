import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Subdomain routing: dashboard/dashboard2/admin.* → /admin
  const isDashboardSubdomain =
    hostname.startsWith('dashboard.') ||
    hostname.startsWith('dashboard2.') ||
    hostname.startsWith('admin.');

  if (isDashboardSubdomain && !pathname.startsWith('/admin') && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Redirect main domain /admin to dashboard subdomain
  if (!isDashboardSubdomain && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
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
