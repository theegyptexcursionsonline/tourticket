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
