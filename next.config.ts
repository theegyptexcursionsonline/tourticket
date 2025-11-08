// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Server external packages configuration
  serverExternalPackages: ['mongoose'],

  // Image optimization configuration
  images: {
    remotePatterns: [
      // Cloudinary (example)
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dm3sxllch/**',
      },
      // Wikimedia (example)
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/wikipedia/en/thumb/4/41/Flag_of_India.svg/**',
      },
      // Unsplash static CDN (recommended for stable images)
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

      // ----------------- Add your CDN host(s) here -----------------
      // Exact hostname (https://your-cdn.com/...)
      {
        protocol: 'https',
        hostname: 'your-cdn.com',
        pathname: '/**',
      },
      // Allow any subdomain like https://cdn.your-cdn.com/ or https://images.your-cdn.com/
      {
        protocol: 'https',
        hostname: '**.your-cdn.com',
        pathname: '/**',
      },

      // If you have other CDNs or domains, add them similarly.
    ],
    // Image formats
    formats: ['image/webp', 'image/avif'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different breakpoints
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
     // ❌ Remove this line:
    // {
    //   source: '/api/tours/:path*',
    //   destination: '/api/admin/tours/:path*',
    // },
    ];
  },

  // Redirects for SEO and user experience
  async redirects() {
    return [
      {
        source: '/tour/:slug',
        destination: '/:slug',
        permanent: true,
      },
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
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
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
  },

  // Webpack configuration for additional optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
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
  output: 'standalone',
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

// Export with Sentry configuration
module.exports = withSentryConfig(nextConfig, {
  org: 'egyptexcursionsonline',
  project: 'javascript-nextjs',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  disableLogger: true,
  automaticVercelMonitors: true,
  hideSourceMaps: true,
  disableServerWebpackPlugin: process.env.NODE_ENV === 'development',
  disableClientWebpackPlugin: process.env.NODE_ENV === 'development',
});
