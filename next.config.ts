import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/business',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rovphhvuuxwbhgnsifto.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
