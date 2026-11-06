/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@prisma/orm-postgres'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;