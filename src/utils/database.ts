import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrismaClient() {
  const connectionString = (process.env.DATABASE_URL || '').replace('?pgbouncer=true', '');
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = typeof window === 'undefined'
  ? (globalForPrisma.prisma || createPrismaClient())
  : {} as any;

if (typeof window === 'undefined') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
