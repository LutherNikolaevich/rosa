import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'rosa',
    short_name: 'rosa',
    description: 'flowers that never wilt.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbf6ef',
    theme_color: '#fbf6ef',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
