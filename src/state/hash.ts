import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { parseBouquet, type Bouquet } from './schema'

const round = (value: unknown): unknown => {
  if (typeof value === 'number') return Math.round(value * 100) / 100
  if (Array.isArray(value)) return value.map(round)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, round(v)]))
  return value
}

export function withoutMedia(b: Bouquet): Bouquet {
  return {
    ...b,
    card: { ...b.card, sig: null },
    media: { ...b.media, photos: [], voice: null },
    reveal: { ...b.reveal, secret: null },
    items: b.items.map(({ photo: _photo, ...item }) => item),
  }
}

export function encodeHash(b: Bouquet): string {
  const stripped = withoutMedia(b)
  return compressToEncodedURIComponent(JSON.stringify(round(stripped)))
}

export function decodeHash(encoded: string): Bouquet | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const parsed = parseBouquet(JSON.parse(json))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
