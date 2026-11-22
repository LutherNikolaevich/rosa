import { create } from 'zustand'
import { nanoid } from 'nanoid'

export type MediaKind = 'photo' | 'voice' | 'sig' | 'snapshot'

interface MediaState {
  urls: Record<string, string>
  blobs: Record<string, { blob: Blob; kind: MediaKind }>
  addLocal: (blob: Blob, kind: MediaKind) => string
  setRemote: (map: Record<string, string>) => void
}

export const isLocalRef = (ref: string) => ref.startsWith('media:local_')

export const useMedia = create<MediaState>((set) => ({
  urls: {},
  blobs: {},
  addLocal: (blob, kind) => {
    const ref = `media:local_${nanoid(10).replace(/[^A-Za-z0-9]/g, 'x')}`
    set((s) => ({ urls: { ...s.urls, [ref]: URL.createObjectURL(blob) }, blobs: { ...s.blobs, [ref]: { blob, kind } } }))
    return ref
  },
  setRemote: (map) => set((s) => ({ urls: { ...s.urls, ...map } })),
}))

export const mediaUrl = (ref: string | null | undefined) => (ref ? useMedia.getState().urls[ref] : undefined)

export async function resizeImage(file: Blob, max = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality))
}
