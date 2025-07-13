/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const BACKEND_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'https://medplant-yjp2.onrender.com';
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  output: 'standalone',
};

export default nextConfig;
