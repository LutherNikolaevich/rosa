import { createBouquet } from '@/lib/bouquets'

export const POST = (request: Request) => createBouquet(request)
