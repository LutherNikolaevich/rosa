import { addReaction } from '@/lib/bouquets'

export const POST = async (request: Request, { params }: { params: Promise<{ id: string }> }) => addReaction(request, (await params).id)
