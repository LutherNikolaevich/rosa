import { and, count, eq, inArray, isNull, lt } from 'drizzle-orm'
import { z } from 'zod'
import { bouquets, media, reactions } from '@/db/schema'
import { LinkOptionsSchema, MEDIA_REF, ReactionSchema, mediaRefs, parseBouquet, type Bouquet, type LinkOptions } from '@/src/state/schema'
import { db } from './db'
import { blob } from './blob'
import { flag } from './flags'
import { limited } from './ratelimit'
import { LIMITS, MEDIA_PATH, type MediaKind } from './media'
import { clientIp, hashSecret, isBot, newId, newToken, safeEqual, sha256, verifySecret } from './security'

type Row = typeof bouquets.$inferSelect
type MediaRow = typeof media.$inferSelect

const MAX_JSON_BYTES = 300_000
const MAX_REACTIONS = 50
const ID = /^[A-Za-z0-9]{6,8}$/

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
const fail = (error: string, status: number) => reply({ error }, status)

export async function loadBouquet(id: string): Promise<Row | null> {
  if (!ID.test(id)) return null
  const [row] = await (await db()).select().from(bouquets).where(eq(bouquets.id, id))
  return row ?? null
}

export const isExpired = (row: Row) => !!row.expiresAt && row.expiresAt.getTime() <= Date.now()

const isOwner = (request: Request, row: Row) => {
  const token = request.headers.get('x-edit-token')
  return !!token && safeEqual(sha256(token), row.editTokenHash)
}

const UploadsSchema = z.record(z.string().regex(MEDIA_REF), z.string().max(2000))

interface Input {
  state: Bouquet
  options: LinkOptions
  uploads: Record<string, string>
}

async function readInput(request: Request): Promise<Input | null> {
  const text = await request.text()
  if (text.length > MAX_JSON_BYTES) return null
  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    return null
  }
  const state = parseBouquet(body?.state)
  const options = LinkOptionsSchema.safeParse(body?.options ?? {})
  const uploads = UploadsSchema.safeParse(body?.uploads ?? {})
  if (!state.success || !options.success || !uploads.success) return null
  return { state: state.data, options: options.data, uploads: uploads.data }
}

function wantedMedia(state: Bouquet, snapshot: string | null): Map<string, MediaKind> | null {
  const uses: [string | null | undefined, MediaKind][] = [
    ...state.media.photos.map((ref) => [ref, 'photo'] as [string, MediaKind]),
    ...state.items.map((item) => [item.photo, 'photo'] as [string | undefined, MediaKind]),
    [state.media.voice, 'voice'],
    [state.card.sig, 'sig'],
    [snapshot, 'snapshot'],
  ]
  const wanted = new Map<string, MediaKind>()
  for (const [ref, kind] of uses) {
    if (!ref) continue
    if (wanted.has(ref) && wanted.get(ref) !== kind) return null
    wanted.set(ref, kind)
  }
  return wanted
}

const keyOf = (ref: string) => ref.slice('media:'.length)

async function planMedia(bouquetId: string, input: Input, existing: MediaRow[]) {
  const wanted = wantedMedia(input.state, input.options.snapshot)
  if (!wanted) return null
  const added: MediaRow[] = []
  for (const [ref, kind] of wanted) {
    const key = keyOf(ref)
    const owned = existing.find((m) => m.id === key)
    if (owned) {
      if (owned.kind !== kind) return null
      continue
    }
    const url = input.uploads[ref]
    const file = url ? await blob().head(url) : null
    const path = file && MEDIA_PATH.exec(file.pathname)
    if (!file || !path || path[1] !== kind || path[2] !== key) return null
    if (file.size > LIMITS[kind].maxBytes || !LIMITS[kind].types.includes(file.contentType)) return null
    added.push({ id: key, bouquetId, blobUrl: url, kind, contentType: file.contentType, bytes: file.size })
  }
  if (added.length) {
    const taken = await (await db()).select({ id: media.id }).from(media).where(inArray(media.id, added.map((m) => m.id)))
    if (taken.length) return null
  }
  const removed = existing.filter((m) => !wanted.has(`media:${m.id}`))
  return { added, removed }
}

const optionsOf = (row: Row) => ({
  expiresAt: row.expiresAt?.toISOString() ?? null,
  oneTime: row.oneTime,
  allowRemix: row.allowRemix,
  readReceipt: row.readReceipt,
  snapshot: row.snapshot,
})

const columnsFor = (input: Input) => ({
  state: input.state,
  schemaVersion: input.state.v,
  expiresAt: input.options.expiresAt ? new Date(input.options.expiresAt) : null,
  revealAt: input.state.reveal.at ? new Date(input.state.reveal.at) : null,
  oneTime: input.options.oneTime,
  allowRemix: input.options.allowRemix,
  readReceipt: input.options.readReceipt,
  snapshot: input.options.snapshot,
})

export async function createBouquet(request: Request): Promise<Response> {
  if (!(await flag('sharingEnabled'))) return fail('disabled', 503)
  if (await limited('create', clientIp(request))) return fail('rate-limited', 429)
  if (await isBot()) return fail('forbidden', 403)
  const input = await readInput(request)
  if (!input) return fail('invalid', 400)
  if (input.state.reveal.secret && !input.options.secretAnswer) return fail('secret-answer-required', 400)
  const database = await db()
  const editToken = newToken()
  const values = {
    ...columnsFor(input),
    editTokenHash: sha256(editToken),
    secretHash: input.state.reveal.secret && input.options.secretAnswer ? await hashSecret(input.options.secretAnswer) : null,
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = newId()
    const plan = await planMedia(id, input, [])
    if (!plan) return fail('missing-media', 400)
    const [created] = await database.insert(bouquets).values({ id, ...values }).onConflictDoNothing().returning({ id: bouquets.id })
    if (!created) continue
    if (plan.added.length) {
      try {
        await database.insert(media).values(plan.added)
      } catch (error) {
        await database.delete(bouquets).where(eq(bouquets.id, id))
        throw error
      }
    }
    return reply({ id, editToken }, 201)
  }
  return fail('server', 500)
}

async function mediaUrls(bouquetId: string) {
  const rows = await (await db()).select().from(media).where(eq(media.bouquetId, bouquetId))
  return Object.fromEntries(rows.filter((m) => m.kind !== 'snapshot').map((m) => [`media:${m.id}`, `/api/media/${m.id}`]))
}

export async function getBouquet(request: Request, id: string): Promise<Response> {
  const row = await loadBouquet(id)
  if (!row || isExpired(row)) return fail('wilted', 404)
  const database = await db()
  if (isOwner(request, row)) {
    const list = await database.select().from(reactions).where(eq(reactions.bouquetId, id)).orderBy(reactions.id)
    return reply({
      state: row.state,
      options: optionsOf(row),
      media: await mediaUrls(id),
      reactions: list.map((r) => ({ emoji: r.emoji, reply: r.reply, at: r.createdAt.toISOString() })),
      openedAt: row.readReceipt ? (row.openedAt?.toISOString() ?? null) : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      owner: true,
    })
  }
  const to = row.state.card.to
  if (row.revealAt && row.revealAt.getTime() > Date.now()) return reply({ locked: 'scheduled', at: row.state.reveal.at, to }, 423)
  if (row.secretHash) {
    const answer = request.headers.get('x-secret-answer')
    const question = row.state.reveal.secret?.q ?? ''
    if (!answer) return reply({ locked: 'secret', question, to }, 403)
    if (await limited('secret', `${id}:${clientIp(request)}`)) return fail('rate-limited', 429)
    if (!(await verifySecret(answer, row.secretHash))) return reply({ locked: 'secret', question, to, wrong: true }, 403)
  }
  if (row.oneTime || row.readReceipt) {
    const [first] = await database
      .update(bouquets)
      .set({ openedAt: new Date() })
      .where(and(eq(bouquets.id, id), isNull(bouquets.openedAt)))
      .returning({ id: bouquets.id })
    if (row.oneTime && !first) return fail('wilted', 410)
  }
  return reply({ state: row.state, media: await mediaUrls(id), allowRemix: row.allowRemix, readReceipt: row.readReceipt, owner: false })
}

export async function updateBouquet(request: Request, id: string): Promise<Response> {
  const row = await loadBouquet(id)
  if (!row) return fail('wilted', 404)
  if (!isOwner(request, row)) return fail('forbidden', 403)
  const input = await readInput(request)
  if (!input) return fail('invalid', 400)
  const database = await db()
  const secretHash = !input.state.reveal.secret ? null : input.options.secretAnswer ? await hashSecret(input.options.secretAnswer) : row.secretHash
  if (input.state.reveal.secret && !secretHash) return fail('secret-answer-required', 400)
  const existing = await database.select().from(media).where(eq(media.bouquetId, id))
  const plan = await planMedia(id, input, existing)
  if (!plan) return fail('missing-media', 400)
  await database.update(bouquets).set({ ...columnsFor(input), secretHash, updatedAt: new Date() }).where(eq(bouquets.id, id))
  if (plan.added.length) await database.insert(media).values(plan.added)
  if (plan.removed.length) {
    await database.delete(media).where(inArray(media.id, plan.removed.map((m) => m.id)))
    await blob().del(plan.removed.map((m) => m.blobUrl))
  }
  return reply({ id })
}

export async function deleteBouquets(ids: string[]) {
  if (!ids.length) return
  const database = await db()
  const files = await database.select({ url: media.blobUrl }).from(media).where(inArray(media.bouquetId, ids))
  await blob().del(files.map((f) => f.url))
  await database.delete(bouquets).where(inArray(bouquets.id, ids))
}

export async function deleteBouquet(request: Request, id: string): Promise<Response> {
  const row = await loadBouquet(id)
  if (!row) return fail('wilted', 404)
  if (!isOwner(request, row)) return fail('forbidden', 403)
  await deleteBouquets([id])
  return new Response(null, { status: 204 })
}

export async function addReaction(request: Request, id: string): Promise<Response> {
  if (await limited('react', `${id}:${clientIp(request)}`)) return fail('rate-limited', 429)
  const row = await loadBouquet(id)
  if (!row || isExpired(row)) return fail('wilted', 404)
  const body = await request.json().catch(() => null)
  const reaction = ReactionSchema.safeParse(body)
  if (!reaction.success) return fail('invalid', 400)
  const database = await db()
  const [{ total }] = await database.select({ total: count() }).from(reactions).where(eq(reactions.bouquetId, id))
  if (total >= MAX_REACTIONS) return fail('full', 429)
  await database.insert(reactions).values({ bouquetId: id, ...reaction.data })
  return reply({ ok: true }, 201)
}

export async function serveMedia(request: Request, key: string): Promise<Response> {
  if (!/^[A-Za-z0-9]{20}$/.test(key)) return new Response(null, { status: 404 })
  const [found] = await (await db()).select().from(media).innerJoin(bouquets, eq(media.bouquetId, bouquets.id)).where(eq(media.id, key))
  if (!found || found.media.kind === 'snapshot' || isExpired(found.bouquets)) return new Response(null, { status: 404 })
  const file = await blob().read(found.media.blobUrl)
  if (!file) return new Response(null, { status: 404 })
  const data = await new Response(file.body).arrayBuffer()
  const headers = {
    'content-type': found.media.contentType,
    'cache-control': 'private, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'accept-ranges': 'bytes',
  }
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '')
  if (!range || (!range[1] && !range[2])) return new Response(data, { headers })
  const size = data.byteLength
  const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
  const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } })
  return new Response(data.slice(start, end + 1), { status: 206, headers: { ...headers, 'content-range': `bytes ${start}-${end}/${size}` } })
}

export async function previewOf(id: string): Promise<{ to: string; snapshot: string | null } | null> {
  const row = await loadBouquet(id)
  if (!row || isExpired(row)) return null
  if (!row.snapshot) return { to: row.state.card.to, snapshot: null }
  const [file] = await (await db()).select().from(media).where(eq(media.id, keyOf(row.snapshot)))
  const data = file && (await blob().read(file.blobUrl))
  if (!data) return { to: row.state.card.to, snapshot: null }
  const base64 = Buffer.from(await new Response(data.body).arrayBuffer()).toString('base64')
  return { to: row.state.card.to, snapshot: `data:${file.contentType};base64,${base64}` }
}

export async function cleanup(now = new Date()): Promise<{ bouquets: number; orphans: number }> {
  const database = await db()
  const graceCutoff = new Date(now.getTime() - 86_400_000)
  const expired = await database.select({ id: bouquets.id }).from(bouquets).where(lt(bouquets.expiresAt, graceCutoff))
  await deleteBouquets(expired.map((b) => b.id))
  const candidates = await blob().olderThan(graceCutoff)
  const kept = new Set<string>()
  for (let i = 0; i < candidates.length; i += 500) {
    const rows = await database.select({ url: media.blobUrl }).from(media).where(inArray(media.blobUrl, candidates.slice(i, i + 500)))
    rows.forEach((r) => kept.add(r.url))
  }
  const orphans = candidates.filter((url) => !kept.has(url))
  await blob().del(orphans)
  return { bouquets: expired.length, orphans: orphans.length }
}
