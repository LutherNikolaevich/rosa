import { deleteBouquet, getBouquet, updateBouquet } from '@/lib/bouquets'

type Context = { params: Promise<{ id: string }> }

export const GET = async (request: Request, { params }: Context) => getBouquet(request, (await params).id)
export const PATCH = async (request: Request, { params }: Context) => updateBouquet(request, (await params).id)
export const DELETE = async (request: Request, { params }: Context) => deleteBouquet(request, (await params).id)
