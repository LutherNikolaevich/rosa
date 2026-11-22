export const MEDIA_KINDS = ['photo', 'voice', 'sig', 'snapshot'] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]

export const LIMITS: Record<MediaKind, { maxBytes: number; types: string[] }> = {
  photo: { maxBytes: 8_000_000, types: ['image/jpeg', 'image/png', 'image/webp'] },
  voice: { maxBytes: 5_000_000, types: ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'] },
  sig: { maxBytes: 400_000, types: ['image/png'] },
  snapshot: { maxBytes: 1_500_000, types: ['image/jpeg', 'image/png'] },
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) => signature.every((b, i) => bytes[offset + i] === b)
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

export function sniff(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'image/png'
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp'
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'audio/webm'
  if (startsWith(bytes, ascii('ftyp'), 4)) return 'audio/mp4'
  if (startsWith(bytes, ascii('OggS'))) return 'audio/ogg'
  if (startsWith(bytes, ascii('ID3')) || startsWith(bytes, [0xff, 0xfb])) return 'audio/mpeg'
  return null
}

export function checkMedia(kind: string, bytes: Uint8Array): { ok: true; contentType: string; kind: MediaKind } | { ok: false; error: string } {
  if (!isMediaKind(kind)) return { ok: false, error: 'bad-kind' }
  const limit = LIMITS[kind]
  if (bytes.byteLength > limit.maxBytes) return { ok: false, error: 'too-large' }
  const contentType = sniff(bytes)
  if (!contentType || !limit.types.includes(contentType)) return { ok: false, error: 'bad-type' }
  return { ok: true, contentType, kind }
}

export const isMediaKind = (kind: string): kind is MediaKind => (MEDIA_KINDS as readonly string[]).includes(kind)

export const MEDIA_PATH = /^(photo|voice|sig|snapshot)\/([A-Za-z0-9]{20})(?:-[A-Za-z0-9]+)?(?:\.[a-z0-9]+)?$/
