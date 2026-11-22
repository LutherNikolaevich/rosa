import { del, get, head, list } from '@vercel/blob'

export interface StoredFile {
  pathname: string
  size: number
  contentType: string
  uploadedAt: Date
}

export interface BlobStore {
  local: boolean
  head(url: string): Promise<StoredFile | null>
  read(url: string): Promise<{ body: ReadableStream<Uint8Array> | ArrayBuffer; contentType: string } | null>
  del(urls: string[]): Promise<void>
  olderThan(date: Date): Promise<string[]>
  put?(pathname: string, data: ArrayBuffer, contentType: string): Promise<string>
}

const LOCAL = 'local:'

function memoryBlob(): BlobStore {
  const files = new Map<string, StoredFile & { data: ArrayBuffer }>()
  const find = (url: string) => (url.startsWith(LOCAL) ? files.get(url.slice(LOCAL.length)) : undefined)
  return {
    local: true,
    async head(url) {
      const file = find(url)
      return file ? { pathname: file.pathname, size: file.size, contentType: file.contentType, uploadedAt: file.uploadedAt } : null
    },
    async read(url) {
      const file = find(url)
      return file ? { body: file.data, contentType: file.contentType } : null
    },
    async del(urls) {
      urls.forEach((url) => files.delete(url.slice(LOCAL.length)))
    },
    async olderThan(date) {
      return [...files.values()].filter((f) => f.uploadedAt < date).map((f) => LOCAL + f.pathname)
    },
    async put(pathname, data, contentType) {
      files.set(pathname, { pathname, data, contentType, size: data.byteLength, uploadedAt: new Date() })
      return LOCAL + pathname
    },
  }
}

function vercelBlob(): BlobStore {
  return {
    local: false,
    async head(url) {
      if (!URL.canParse(url) || !new URL(url).hostname.endsWith('.blob.vercel-storage.com')) return null
      return head(url).catch(() => null)
    },
    async read(url) {
      const file = await get(url, { access: 'private' }).catch(() => null)
      return file?.statusCode === 200 ? { body: file.stream, contentType: file.blob.contentType } : null
    },
    async del(urls) {
      if (urls.length) await del(urls)
    },
    async olderThan(date) {
      const urls: string[] = []
      let cursor: string | undefined
      do {
        const page = await list({ cursor, limit: 1000 })
        urls.push(...page.blobs.filter((b) => b.uploadedAt < date).map((b) => b.url))
        cursor = page.hasMore ? page.cursor : undefined
      } while (cursor)
      return urls
    },
  }
}

const cache = globalThis as unknown as { rosaBlob?: BlobStore }

export const blob = () => (cache.rosaBlob ??= process.env.BLOB_READ_WRITE_TOKEN ? vercelBlob() : memoryBlob())
