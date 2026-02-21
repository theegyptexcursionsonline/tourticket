import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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
