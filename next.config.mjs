/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    'better-sqlite3',
    'playwright',
    'lighthouse',
    'nodemailer',
    'pngjs',
    'pixelmatch',
  ],
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
};

export default nextConfig;
