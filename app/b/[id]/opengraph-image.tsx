import { ImageResponse } from 'next/og'
import { previewOf } from '@/lib/bouquets'

export const alt = 'a bouquet made with rosa'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const preview = await previewOf((await params).id).catch(() => null)
  const to = preview?.to
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', padding: 35, gap: 48, background: 'linear-gradient(135deg, #fbf4ec 0%, #f5dfe2 100%)' }}>
        {preview?.snapshot ? (
          <img src={preview.snapshot} width={560} height={560} style={{ borderRadius: 32, objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', fontSize: 260 }}>💐</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 30, color: '#a0626f', letterSpacing: 2 }}>someone sent you flowers</div>
          <div style={{ display: 'flex', fontSize: 64, color: '#3b2a2a', lineHeight: 1.1 }}>{to ? `a bouquet for ${to}, made with rosa 🌹` : 'a bouquet for you, made with rosa 🌹'}</div>
          <div style={{ display: 'flex', fontSize: 28, color: '#7a6560' }}>tap to open</div>
        </div>
      </div>
    ),
    { ...size, emoji: 'twemoji' },
  )
}
