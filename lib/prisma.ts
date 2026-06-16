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
  // Use DIRECT_URL (port 5432) instead of DATABASE_URL (port 6543)
  // because the pg module doesn't support PgBouncer transaction mode well.
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!;
  const pool = new Pool({ 
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
  globalForPrisma.prisma = prisma;
}

export { prisma };

