import { get } from '@vercel/global-config'

export type Flag = 'sharingEnabled' | 'uploadsEnabled' | 'galleryEnabled' | 'aiEnabled'

export async function flag(name: Flag): Promise<boolean> {
  if (!process.env.EDGE_CONFIG) return true
  return (await get<boolean>(name).catch(() => undefined)) !== false
}
