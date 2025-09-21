import {withSentryConfig} from '@sentry/nextjs';
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

  images: {
    remotePatterns: [
      // Cloudinary (your cloud)
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        // scope only to your cloud + allow any path under it
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

      // Unsplash dynamic source endpoint (source.unsplash.com)
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;

export default withSentryConfig(undefined, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "egyptexcursionsonline",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});