import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Reserved paths that should NOT be treated as tour slugs
  const reservedPaths = [
    '/admin',
    '/api',
    '/auth',
    '/login',
    '/signup',
    '/destinations',
    '/categories', 
    '/blog',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/cart',
    '/checkout',
    '/profile',
    '/bookings',
    '/wishlist',
    '/search',
    '/help',
    '/support',
    '/careers',
    '/press',
    '/partners',
    '/_next',
    '/favicon.ico',
    '/images',
    '/uploads',
    '/static',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.json'
  ];
  
  // Check if path starts with any reserved path
  const isReserved = reservedPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );
  
  // Skip middleware for reserved paths
  if (isReserved) {
    return NextResponse.next();
  }
  
  // Skip for files with extensions
  if (pathname.includes('.') && !pathname.endsWith('/')) {
    return NextResponse.next();
  }
  
  // For all other paths, let the [slug] route handle it
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};