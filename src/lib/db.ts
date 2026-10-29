import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      // resolve the SQLite file against the project root regardless of cwd
      db: { url: process.env.DATABASE_URL?.startsWith('file:./') || process.env.DATABASE_URL?.startsWith('file:../')
        ? `file:${process.cwd()}/db/custom.db`
        : process.env.DATABASE_URL },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
