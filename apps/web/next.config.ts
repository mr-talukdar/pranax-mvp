import { createRequire } from 'node:module';
import type { NextConfig } from 'next';

const require = createRequire(import.meta.url);
const { PrismaPlugin } = require('@prisma/nextjs-monorepo-workaround-plugin');

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack(config, { isServer }) {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

export default nextConfig;
