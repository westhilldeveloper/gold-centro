/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  
  // 1. Tell Turbopack to compile Prisma's files correctly
  transpilePackages: ['@prisma/orm-postgres'],
  
  // 2. Ignore TS errors since this is a JS project
  typescript: {
    ignoreBuildErrors: true,
  },

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