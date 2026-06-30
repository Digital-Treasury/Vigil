import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Single Node service for prod (Docker). Worker is a separate process.
  output: 'standalone',
  // Compile the workspace TS packages directly — no separate build step.
  transpilePackages: ['@vigil/core', '@vigil/db', '@vigil/storage'],
  outputFileTracingRoot: process.cwd() + '/../../',
  serverExternalPackages: ['@prisma/client', 'bullmq', 'ioredis', '@anthropic-ai/sdk'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
