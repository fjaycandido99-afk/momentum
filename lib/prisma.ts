import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Direct connection (port 5432) - more reliable for Supabase
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Aundanao102499@db.jkrpreixylczfdfdyxrm.supabase.co:5432/postgres'

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
