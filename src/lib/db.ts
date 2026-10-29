import { PrismaClient } from '@prisma/client'

/**
 * Resolve a *relative* SQLite path against the project root regardless of cwd,
 * preserving the original file name (file:../db/custom.db → <root>/db/custom.db).
 * Non-relative URLs pass through untouched, so a dedicated test or ops database
 * is never silently rerouted. Exported so tests can verify the resolved path
 * before running any destructive setup.
 */
export function resolveDatabaseUrl(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined
  return raw.startsWith('file:./') || raw.startsWith('file:../')
    ? `file:${process.cwd()}/db/${raw.split('/').pop()}`
    : raw
}

/** The SQLite file path behind the current configuration, without the file: scheme. */
export function resolvedDatabaseFile(): string | undefined {
  const url = resolveDatabaseUrl(process.env.DATABASE_URL)
  return url?.startsWith('file:') ? url.slice('file:'.length) : url
}

// Clients are cached per resolved URL. A test process that sets DATABASE_URL to
// a temporary database therefore gets its own client and can never reuse (or
// be handed) the client bound to the development database.
const globalForPrisma = globalThis as unknown as {
  prismaClients: Map<string, PrismaClient> | undefined
}

function clientFor(url: string | undefined): PrismaClient {
  const key = url ?? '(prisma-default)'
  globalForPrisma.prismaClients ??= new Map()
  let client = globalForPrisma.prismaClients.get(key)
  if (!client) {
    client = url
      ? new PrismaClient({ datasources: { db: { url } } })
      : new PrismaClient()
    globalForPrisma.prismaClients.set(key, client)
  }
  return client
}

export const db = clientFor(resolveDatabaseUrl(process.env.DATABASE_URL))
