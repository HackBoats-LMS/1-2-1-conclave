import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent @prisma/client from being bundled into individual route chunks.
  // This ensures the global singleton in lib/prisma.ts is properly shared.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
};

export default nextConfig;
