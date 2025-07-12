// next.config.js
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
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/wikipedia/en/thumb/4/41/Flag_of_India.svg/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // For Unsplash
        pathname: '/**', //  Be more specific if possible!
      },
      // Add other hosts as needed
    ],
  },
};

module.exports = nextConfig;