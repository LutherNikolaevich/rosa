import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { customAlphabet } from 'nanoid'
import { blob } from '@/lib/blob'
import { flag } from '@/lib/flags'
import { limited } from '@/lib/ratelimit'
import { checkMedia, LIMITS, MEDIA_PATH, type MediaKind } from '@/lib/media'
import { clientIp, isBot } from '@/lib/security'

const newKey = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 20)

async function refuse(request: Request): Promise<Response | null> {
  if (!(await flag('uploadsEnabled'))) return Response.json({ error: 'disabled' }, { status: 503 })
  if (await limited('upload', clientIp(request))) return Response.json({ error: 'rate-limited' }, { status: 429 })
  if (await isBot()) return Response.json({ error: 'forbidden' }, { status: 403 })
  return null
}

async function localUpload(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof Blob)) return Response.json({ error: 'invalid' }, { status: 400 })
  const data = await file.arrayBuffer()
  const check = checkMedia(String(form?.get('kind')), new Uint8Array(data))
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 })
  const url = await blob().put!(`${check.kind}/${newKey()}`, data, check.contentType)
  return Response.json({ url, pathname: url.slice('local:'.length) }, { status: 201 })
}

export async function POST(request: Request) {
  if (blob().local) return (await refuse(request)) ?? localUpload(request)
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null
  if (!body) return Response.json({ error: 'invalid' }, { status: 400 })
  if (body.type === 'blob.generate-client-token') {
    const refused = await refuse(request)
    if (refused) return refused
  }
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const match = MEDIA_PATH.exec(pathname)
        if (!match) throw new Error('bad-path')
        const limit = LIMITS[match[1] as MediaKind]
        return { allowedContentTypes: limit.types, maximumSizeInBytes: limit.maxBytes, addRandomSuffix: true }
      },
      onUploadCompleted: async () => {},
    })
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 })
  }
}
