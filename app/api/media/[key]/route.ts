import { serveMedia } from '@/lib/bouquets'

export const GET = async (request: Request, { params }: { params: Promise<{ key: string }> }) => serveMedia(request, (await params).key)
