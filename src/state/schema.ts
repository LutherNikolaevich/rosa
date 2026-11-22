import { z } from 'zod'
import { SPECIES_IDS } from './species'

export const STYLES = ['round', 'cascade', 'hand-tied', 'posy', 'fan', 'heart', 'single', 'box'] as const
export const ENVS = ['golden-hour', 'cafe', 'night', 'starry'] as const
export const PARTICLES = ['none', 'pollen', 'petals', 'fireflies', 'rain', 'stars'] as const
export const MUSIC = ['none', 'music-box', 'warm-pad', 'lofi'] as const
export const WRAPS = ['kraft', 'korean', 'tissue', 'cellophane', 'burlap', 'newspaper', 'silk', 'wooden-box', 'hat-box', 'glass-vase', 'ceramic-vase', 'basket', 'none'] as const
export const PATTERNS = ['none', 'stripes', 'dots', 'florals', 'text'] as const
export const RIBBONS = ['satin-bow', 'long-tails', 'twine', 'lace', 'satin'] as const
export const CARD_SHAPES = ['tag', 'envelope', 'heart', 'polaroid'] as const
export const FONTS = ['handwriting-1', 'handwriting-2', 'handwriting-3', 'serif', 'display', 'sans', 'rounded', 'typewriter'] as const
export const FINISHES = ['natural', 'velvet', 'pearl', 'glitter'] as const
export const INTROS = ['box', 'envelope', 'none'] as const

export const MEDIA_REF = /^media:[A-Za-z0-9_-]{4,64}$/
const HEX = /^#[0-9a-fA-F]{6}$/

const clamp = (min: number, max: number) => (v: number) => Math.min(max, Math.max(min, v))
const num = (min: number, max: number, fallback: number) => z.number().finite().catch(fallback).transform(clamp(min, max))
const int = (min: number, max: number, fallback: number) => num(min, max, fallback).transform(Math.round)
const sanitize = (max: number) => (v: string) => v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g, '').slice(0, max)
const text = (max: number) => z.string().catch('').transform(sanitize(max))
const hex = (fallback: string) => z.string().regex(HEX).catch(fallback).transform((v) => v.toLowerCase())
const ref = z.string().regex(MEDIA_REF)
const optRef = ref.nullable().catch(null)
const vec3 = (min: number, max: number) => z.tuple([num(min, max, 0), num(min, max, 0), num(min, max, 0)])
const oneOf = <T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) => z.enum(values).catch(fallback)

export const ItemSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,16}$/),
  t: z.enum(SPECIES_IDS),
  stage: num(0, 1, 1),
  c: z.array(hex('#ffffff')).min(1).max(2),
  finish: oneOf(FINISHES, 'natural'),
  p: vec3(-4, 4),
  r: vec3(-Math.PI, Math.PI),
  s: num(0.3, 2.5, 1),
  l: num(0.3, 2, 1),
  leaves: int(0, 6, 1),
  group: z.string().regex(/^[A-Za-z0-9_-]{1,16}$/).nullable().catch(null),
  locked: z.boolean().catch(false),
  hidden: z.boolean().catch(false),
  photo: optRef.optional(),
})

export const MAX_ITEMS = 100
export const SOFT_MAX_ITEMS = 60

const ItemsSchema = z
  .array(z.unknown())
  .catch([])
  .transform((list) =>
    list.slice(0, MAX_ITEMS).flatMap((raw) => {
      const parsed = ItemSchema.safeParse(raw)
      return parsed.success ? [parsed.data] : []
    }),
  )

export const BouquetSchema = z.object({
  v: z.literal(2),
  seed: int(0, 2 ** 31 - 1, 1),
  style: oneOf(STYLES, 'round'),
  scene: z.object({
    env: oneOf(ENVS, 'golden-hour'),
    wind: num(0, 1, 0.3),
    particles: oneOf(PARTICLES, 'pollen'),
    music: oneOf(MUSIC, 'none'),
    volume: num(0, 1, 0.6),
  }),
  wrap: z.object({
    t: oneOf(WRAPS, 'kraft'),
    colors: z.array(hex('#d9c3a5')).min(1).max(3).catch(['#d9c3a5']),
    pattern: oneOf(PATTERNS, 'none'),
    layers: int(1, 5, 2),
    crinkle: num(0, 1, 0.4),
    text: text(40),
    font: oneOf(FONTS, 'serif'),
  }),
  ribbon: z.object({
    t: oneOf(RIBBONS, 'satin-bow'),
    c: hex('#e05a7a'),
    len: num(0.3, 2, 1),
    text: text(30),
  }),
  card: z.object({
    shape: oneOf(CARD_SHAPES, 'tag'),
    font: oneOf(FONTS, 'handwriting-1'),
    ink: hex('#3b2a2a'),
    size: num(0.8, 1.6, 1),
    to: text(40),
    body: text(1000),
    from: text(40),
    sig: optRef,
  }),
  media: z.object({
    photos: z.array(ref).max(3).catch([]),
    voice: optRef,
    transcript: text(2000),
  }),
  reveal: z.object({
    at: z.iso.datetime({ offset: true }).nullable().catch(null),
    secret: z.object({ q: text(120) }).nullable().catch(null),
    intro: oneOf(INTROS, 'box'),
  }),
  items: ItemsSchema,
})

export type Bouquet = z.output<typeof BouquetSchema>
export type Item = z.output<typeof ItemSchema>
export type Style = (typeof STYLES)[number]
export type Env = (typeof ENVS)[number]
export type Finish = (typeof FINISHES)[number]
export type WrapType = (typeof WRAPS)[number]
export type RibbonType = (typeof RIBBONS)[number]
export type FontId = (typeof FONTS)[number]

export const LinkOptionsSchema = z.object({
  expiresAt: z.iso.datetime({ offset: true }).nullable().default(null),
  oneTime: z.boolean().default(false),
  allowRemix: z.boolean().default(true),
  readReceipt: z.boolean().default(false),
  secretAnswer: z.string().max(120).nullable().default(null),
  snapshot: ref.nullable().default(null),
})
export type LinkOptions = z.output<typeof LinkOptionsSchema>

export const ReactionSchema = z.object({
  emoji: z.enum(['❤️', '😭', '🥰', '😂', '🌸']),
  reply: text(280),
})
export type Reaction = z.output<typeof ReactionSchema> & { at: string }

export function emptyBouquet(seed = Math.floor(Math.random() * 2 ** 31)): Bouquet {
  return BouquetSchema.parse({
    v: 2,
    seed,
    style: 'round',
    scene: {},
    wrap: { t: 'korean', colors: ['#f7d6e0', '#fffaf3'], layers: 3 },
    ribbon: { t: 'satin-bow', c: '#e05a7a', len: 1 },
    card: { to: '', body: '', from: '' },
    media: { photos: [] },
    reveal: { intro: 'box' },
    items: [],
  })
}

interface BouquetV1 {
  version: 1
  seed?: number
  flowers?: { type?: string; color?: string; x?: number; y?: number; z?: number; size?: number }[]
  wrap?: string
  message?: { to?: string; from?: string; text?: string }
}

export function migrate_v1_to_v2(old: BouquetV1): unknown {
  return {
    v: 2,
    seed: old.seed ?? 1,
    style: 'round',
    scene: {},
    wrap: { t: old.wrap ?? 'kraft', colors: ['#d9c3a5'] },
    ribbon: {},
    card: { to: old.message?.to ?? '', from: old.message?.from ?? '', body: old.message?.text ?? '' },
    media: { photos: [] },
    reveal: {},
    items: (old.flowers ?? []).map((f, i) => ({
      id: `m${i}`,
      t: f.type,
      stage: 1,
      c: [f.color ?? '#d6336c'],
      p: [f.x ?? 0, f.y ?? 0, f.z ?? 0],
      r: [0, 0, 0],
      s: f.size ?? 1,
      l: 1,
      leaves: 1,
    })),
  }
}

const MIGRATIONS: Record<number, (input: any) => unknown> = { 1: migrate_v1_to_v2 }

export function migrate(input: unknown): unknown {
  let current: any = input
  for (let guard = 0; guard < 10 && current && typeof current === 'object'; guard++) {
    const version = current.v ?? current.version
    if (version === 2) return current
    const step = MIGRATIONS[version]
    if (!step) return current
    current = step(current)
  }
  return current
}

export function parseBouquet(input: unknown) {
  return BouquetSchema.safeParse(migrate(input))
}

export function mediaRefs(b: Bouquet): string[] {
  const refs = [...b.media.photos, b.media.voice, b.card.sig, ...b.items.map((i) => i.photo)]
  return [...new Set(refs.filter((r): r is string => !!r))]
}
