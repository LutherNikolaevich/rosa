import { customAlphabet } from 'nanoid'
import { encodeHash } from '@/src/state/hash'
import { mediaRefs, type Bouquet, type LinkOptions, type Reaction } from '@/src/state/schema'
import { isLocalRef, useMedia, type MediaKind } from './media'
import type { SharedLink } from './store'

const SENT_KEY = 'rosa_sent'

export interface SentRecord extends SharedLink {
  to: string
  createdAt: string
}

export const sentLinks = (): SentRecord[] => {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

const rememberSent = (record: SentRecord) => {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify([record, ...sentLinks().filter((r) => r.id !== record.id)].slice(0, 50)))
  } catch {}
}

export const forgetSent = (id: string) => {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(sentLinks().filter((r) => r.id !== id)))
  } catch {}
}

export const editTokenFor = (id: string) => sentLinks().find((r) => r.id === id)?.editToken ?? null

export const siteOrigin = () => process.env.NEXT_PUBLIC_SITE_URL ?? location.origin
export const linkUrl = (id: string) => `${siteOrigin()}/b/${id}`
export const hashUrl = (doc: Bouquet) => `${siteOrigin()}/#b=${encodeHash(doc)}`

async function api<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  const res = await fetch(`/api${path}`, { ...init, headers: { 'content-type': 'application/json', ...init.headers } })
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, body: body as T }
}

const newMediaKey = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 20)

export async function uploadMedia(file: Blob, kind: MediaKind): Promise<{ ref: string; url: string }> {
  const key = newMediaKey()
  try {
    const { upload } = await import('@vercel/blob/client')
    const result = await upload(`${kind}/${key}`, file, { access: 'private', handleUploadUrl: '/api/upload', contentType: file.type.split(';')[0] || undefined })
    return { ref: `media:${key}`, url: result.url }
  } catch (error) {
    const form = new FormData()
    form.append('kind', kind)
    form.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    if (!res.ok) throw error
    const body: { url: string; pathname: string } = await res.json()
    return { ref: `media:${body.pathname.split('/')[1]}`, url: body.url }
  }
}

function remap(doc: Bouquet, map: Record<string, string>): Bouquet {
  const swap = <T extends string | null | undefined>(ref: T) => (ref && map[ref] ? map[ref] : ref) as T
  return {
    ...doc,
    card: { ...doc.card, sig: swap(doc.card.sig) },
    media: { ...doc.media, photos: doc.media.photos.map(swap), voice: swap(doc.media.voice) },
    items: doc.items.map((i) => (i.photo ? { ...i, photo: swap(i.photo) } : i)),
  }
}

export async function uploadLocalMedia(doc: Bouquet): Promise<{ doc: Bouquet; uploads: Record<string, string> }> {
  const { blobs, urls, setRemote } = useMedia.getState()
  const local = mediaRefs(doc).filter(isLocalRef)
  const done = await Promise.all(local.map(async (from) => ({ from, ...(await uploadMedia(blobs[from].blob, blobs[from].kind)) })))
  setRemote(Object.fromEntries(done.map((u) => [u.ref, urls[u.from]])))
  return {
    doc: remap(doc, Object.fromEntries(done.map((u) => [u.from, u.ref]))),
    uploads: Object.fromEntries(done.map((u) => [u.ref, u.url])),
  }
}

export type ShareResult = { kind: 'link'; id: string; editToken: string; url: string; doc: Bouquet } | { kind: 'hash'; url: string; reason: string }

export async function share(doc: Bouquet, options: Omit<LinkOptions, 'snapshot'>, snapshot: Blob | null, existing: SharedLink | null): Promise<ShareResult> {
  try {
    const { doc: uploaded, uploads } = await uploadLocalMedia(doc)
    const snap = snapshot ? await uploadMedia(snapshot, 'snapshot') : null
    if (snap) uploads[snap.ref] = snap.url
    const payload = JSON.stringify({ state: uploaded, options: { ...options, snapshot: snap?.ref ?? null }, uploads })
    if (existing) {
      const res = await api<{ id: string }>(`/bouquets/${existing.id}`, { method: 'PATCH', body: payload, headers: { 'x-edit-token': existing.editToken } })
      if (res.status !== 200) throw new Error(`patch ${res.status}`)
      rememberSent({ ...existing, to: doc.card.to, createdAt: new Date().toISOString() })
      return { kind: 'link', ...existing, url: linkUrl(existing.id), doc: uploaded }
    }
    const res = await api<{ id: string; editToken: string }>('/bouquets', { method: 'POST', body: payload })
    if (res.status !== 201) throw new Error(`create ${res.status}`)
    rememberSent({ id: res.body.id, editToken: res.body.editToken, to: doc.card.to, createdAt: new Date().toISOString() })
    return { kind: 'link', ...res.body, url: linkUrl(res.body.id), doc: uploaded }
  } catch (error) {
    return { kind: 'hash', url: hashUrl(doc), reason: String(error) }
  }
}

export type FetchResult =
  | { kind: 'ready'; state: Bouquet; media: Record<string, string>; allowRemix: boolean; owner: boolean; reactions?: Reaction[]; openedAt?: string | null; options?: Omit<LinkOptions, 'secretAnswer'> }
  | { kind: 'scheduled'; at: string; to: string }
  | { kind: 'secret'; question: string; to: string; wrong?: boolean }
  | { kind: 'wilted' }
  | { kind: 'error' }

const inflight = new Map<string, Promise<FetchResult>>()

export function fetchBouquet(id: string, opts: { answer?: string; editToken?: string | null } = {}): Promise<FetchResult> {
  const key = `${id}|${opts.answer ?? ''}|${opts.editToken ?? ''}`
  const existing = inflight.get(key)
  if (existing) return existing
  const headers: Record<string, string> = {}
  if (opts.answer) headers['x-secret-answer'] = opts.answer
  if (opts.editToken) headers['x-edit-token'] = opts.editToken
  const request = api<any>(`/bouquets/${encodeURIComponent(id)}`, { headers })
    .then(({ status, body }): FetchResult => {
      if (status === 200) {
        useMedia.getState().setRemote(body.media ?? {})
        return { kind: 'ready', state: body.state, media: body.media ?? {}, allowRemix: body.allowRemix ?? body.options?.allowRemix ?? true, owner: !!body.owner, reactions: body.reactions, openedAt: body.openedAt, options: body.options }
      }
      if (status === 423) return { kind: 'scheduled', at: body.at, to: body.to }
      if (status === 403 && body?.locked === 'secret') return { kind: 'secret', question: body.question, to: body.to, wrong: body.wrong }
      if (status === 404 || status === 410) return { kind: 'wilted' }
      return { kind: 'error' }
    })
    .catch((): FetchResult => ({ kind: 'error' }))
  inflight.set(key, request)
  return request
}

export async function sendReaction(id: string, emoji: string, reply: string) {
  const res = await api(`/bouquets/${id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji, reply }) })
  return res.status === 201
}

export async function deleteBouquet(link: SharedLink) {
  const res = await api(`/bouquets/${link.id}`, { method: 'DELETE', headers: { 'x-edit-token': link.editToken } })
  if (res.status === 204 || res.status === 404) forgetSent(link.id)
  return res.status === 204
}
