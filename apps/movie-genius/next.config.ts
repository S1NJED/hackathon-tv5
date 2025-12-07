import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Ignore TypeScript errors (type checking)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignore ESLint errors (linting checks)
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },


};

export default nextConfig;