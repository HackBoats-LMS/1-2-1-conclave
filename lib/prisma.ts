import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma: PrismaClient;

if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  // Use transaction-pooled DATABASE_URL (port 6543) by default to prevent pool exhaustion under serverless load.
  // Fall back to DIRECT_URL (port 5432) only if necessary.
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL!;
  const pool = new Pool({
    connectionString,
    max: 2, // Limit pool size per serverless container to prevent exhausting the 100-connection DB limit
    idleTimeoutMillis: 15000, // Reclaim idle connection sockets quickly
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
  globalForPrisma.prisma = prisma;
}

// In-memory GameState cache layer (2-second TTL)
let cachedGameState: any = null;
let cacheTimestamp = 0;

export async function getCachedGameState() {
  const now = Date.now();
  if (cachedGameState && (now - cacheTimestamp < 2000)) {
    return cachedGameState;
  }
  const state = await prisma.gameState.findFirst();
  cachedGameState = state;
  cacheTimestamp = now;
  return state;
}

export function invalidateGameStateCache() {
  cachedGameState = null;
  cacheTimestamp = 0;
}

export { prisma };


