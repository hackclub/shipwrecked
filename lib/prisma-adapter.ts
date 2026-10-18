import { PrismaPg } from '@prisma/adapter-pg';

export function createPrismaAdapter() {
  return new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Match the previous Prisma pool's connection timeout.
    connectionTimeoutMillis: 5000,
  });
}
