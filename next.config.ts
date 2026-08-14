// next.config.js
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const { withSentryConfig } = require('@sentry/nextjs');
const configuredSearchOrigin = process.env.NEXT_PUBLIC_FOXES_SEARCH_ORIGIN || '';
const searchWidgetOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(configuredSearchOrigin)
  ? configuredSearchOrigin
  : 'https://search.foxestechnology.com';

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"} ${searchWidgetOrigin} https://www.googletagmanager.com https://maps.googleapis.com https://www.google.com https://www.gstatic.com https://apis.google.com https://accounts.google.com https://js.stripe.com https://static.cloudflareinsights.com https://s.adroll.com https://d.adroll.com https://connect.facebook.net https://static.elfsight.com https://elfsightcdn.com https://*.elfsightcdn.com https://connect.foxestechnology.com https://widget.intercom.io https://js.intercomcdn.com`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com https://js.intercomcdn.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  `connect-src 'self' ${searchWidgetOrigin} https://*.algolia.net https://*.algolianet.com https://*.algolia.io https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://www.google.com https://www.gstatic.com https://apis.google.com https://accounts.google.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://*.stripe.com https://*.intercom.io wss://*.intercom.io https://*.intercomcdn.com https://connect.foxestechnology.com wss://connect.foxestechnology.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://static.cloudflareinsights.com https://*.elfsight.com https://*.elfsightcdn.com https://*.adroll.com https://connect.facebook.net https://www.facebook.com https://api.exchangerate-api.com https://api.fixer.io https://res.cloudinary.com https://foxes-tools-api-production.up.railway.app`,
  `frame-src 'self' ${searchWidgetOrigin} https://www.googletagmanager.com https://*.stripe.com https://www.google.com https://accounts.google.com https://*.firebaseapp.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://static.elfsight.com https://elfsightcdn.com https://*.elfsightcdn.com https://connect.foxestechnology.com https://*.intercom.io https://intercom-sheets.com`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "manifest-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  process.env.NODE_ENV === 'production' && !searchWidgetOrigin.startsWith('http://')
    ? "upgrade-insecure-requests"
    : '',
].filter(Boolean).join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Heavy pages (/[locale]/egypt, /[locale]/interests, /[locale]) do
  // MongoDB-backed data fetches during SSG and blow past the 60s default
  // on Netlify's build image. Raise the per-page timeout to 300s so the
  // cold-DB-connection worst case doesn't trip the retry cap.
  staticPageGenerationTimeout: 300,

  // Skip type/lint checks during build — CI catches these separately
  typescript: { ignoreBuildErrors: true },

  // Server external packages configuration
  serverExternalPackages: ['mongoose'],

  // Image optimization configuration - Fixed for Netlify.
  // Use a custom Cloudinary loader instead of `unoptimized: true`. Netlify
  // doesn't run Next's built-in optimizer, so we offload resizing/compression
  // to the Cloudinary CDN via lib/cloudinaryLoader.ts. This stops full-res
  // multi-MB originals from being shipped to phones (the iOS Safari memory
  // crash). next/image still generates a responsive srcSet from the sizes below.
  images: {
    loaderFile: './lib/cloudinaryLoader.ts',
    remotePatterns: [
      // Cloudinary
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dm3sxllch/**',
      },
      // Wikimedia
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/wikipedia/en/thumb/4/41/Flag_of_India.svg/**',
      },
      // Unsplash static CDN
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // Unsplash dynamic source endpoint
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        pathname: '/**',
      },
      // Local development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      // AWS S3 style wildcard
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      // Add your CDN host(s) here
      {
        protocol: 'https',
        hostname: 'your-cdn.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.your-cdn.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Rewrites for backward compatibility and SEO
  async rewrites() {
    return [
      {
        source: '/tours/:slug',
        destination: '/:slug',
      },
      {
        source: '/experiences/:slug',
        destination: '/:slug',
      },
      {
        source: '/activities/:slug',
        destination: '/:slug',
      },
    ];
  },

  // Redirects for SEO and user experience
  async redirects() {
    return [
      {
        source: '/tours/:slug',
        destination: '/:slug',
        permanent: true,
      },
      // NOTE: '/tour/:slug' is now a real route (see app/[locale]/tour/[slug]);
      // it is handled by the URL-type resolver, which renders tours set to the
      // "/tour" URL type and 301-redirects everything else to its canonical URL.
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.yourdomain.com',
          },
        ],
        destination: 'https://yourdomain.com/:path*',
        permanent: true,
      },
    ];
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        // Security headers for all routes
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(self)' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
      {
        // Homepage - NO CACHING for real-time admin updates
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
        ],
      },
      {
        // API routes - no caching
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        // Password reset links carry a short-lived account capability. Keep it
        // out of referrers, caches and search indexes before client hydration.
        source: '/reset-password',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        source: '/:locale(en|ar|es|fr|de)/reset-password',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        // Static assets - long-term caching
        source: '/images/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // Handle trailing slashes consistently
  trailingSlash: false,

  // Environment variables that should be available on the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    // Netlify build metadata, baked in so /api/version can name the live commit.
    COMMIT_REF: process.env.COMMIT_REF ?? '',
    BRANCH: process.env.BRANCH ?? '',
  },

  // Webpack configuration for additional optimization
  webpack: (config: any, { buildId, dev, isServer, defaultLoaders, webpack }: any) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Add any specific aliases you need
    };

    if (!dev && !isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  // Removed output: 'standalone' for Netlify compatibility
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

// Export with next-intl and Sentry configuration
module.exports = withSentryConfig(withNextIntl(nextConfig), {
  org: 'egyptexcursionsonline',
  project: 'egypt-excursionsonline-web',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: {
    automaticVercelMonitors: true,
    disableSentryConfig: process.env.NODE_ENV === 'development',
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
