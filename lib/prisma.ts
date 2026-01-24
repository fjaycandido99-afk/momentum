import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use pooled connection for serverless (port 6543 with pgbouncer)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.jkrpreixylczfdfdyxrm:Aundanao102499@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
