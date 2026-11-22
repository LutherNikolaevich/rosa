import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import type { Bouquet } from '@/src/state/schema'

const stamp = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

export const bouquets = pgTable(
  'bouquets',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id'),
    state: jsonb('state').$type<Bouquet>().notNull(),
    schemaVersion: integer('schema_version').notNull(),
    editTokenHash: text('edit_token_hash').notNull(),
    secretHash: text('secret_hash'),
    expiresAt: stamp('expires_at'),
    revealAt: stamp('reveal_at'),
    oneTime: boolean('one_time').notNull().default(false),
    allowRemix: boolean('allow_remix').notNull().default(true),
    readReceipt: boolean('read_receipt').notNull().default(false),
    isPublic: boolean('is_public').notNull().default(false),
    snapshot: text('snapshot'),
    openedAt: stamp('opened_at'),
    createdAt: stamp('created_at').notNull().defaultNow(),
    updatedAt: stamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('bouquets_expires_at_idx').on(t.expiresAt)],
)

export const media = pgTable(
  'media',
  {
    id: text('id').primaryKey(),
    bouquetId: text('bouquet_id')
      .notNull()
      .references(() => bouquets.id, { onDelete: 'cascade' }),
    blobUrl: text('blob_url').notNull(),
    kind: text('kind').notNull(),
    contentType: text('content_type').notNull(),
    bytes: integer('bytes').notNull(),
  },
  (t) => [index('media_bouquet_id_idx').on(t.bouquetId)],
)

export const reactions = pgTable(
  'reactions',
  {
    id: serial('id').primaryKey(),
    bouquetId: text('bouquet_id')
      .notNull()
      .references(() => bouquets.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    reply: text('reply').notNull(),
    createdAt: stamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('reactions_bouquet_id_idx').on(t.bouquetId)],
)
