import path from 'node:path'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from '@/db/schema'

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
  if (url) {
    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    return drizzle(neon(url), { schema }) as unknown as Db
  }
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const { migrate } = await import('drizzle-orm/pglite/migrator')
  const local = drizzle(new PGlite(), { schema })
  await migrate(local, { migrationsFolder: path.join(process.cwd(), 'db/migrations') })
  return local as unknown as Db
}

const cache = globalThis as unknown as { rosaDb?: Promise<Db> }

export const db = () => (cache.rosaDb ??= connect())

export const resetLocalDb = () => {
  cache.rosaDb = undefined
}
