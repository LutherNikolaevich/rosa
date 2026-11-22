import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'

export function SignaturePad({ ink, onSave }: { ink: string; onSave: (blob: Blob) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    const c = canvas.current!
    const ratio = window.devicePixelRatio || 1
    c.width = c.clientWidth * ratio
    c.height = c.clientHeight * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])
  const point = (e: React.PointerEvent) => {
    const rect = canvas.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5] as const
  }
  return (
    <div className="space-y-2">
      <canvas
        ref={canvas}
        aria-label={t('card.signHere')}
        className="h-32 w-full touch-none rounded-2xl border border-dashed border-cream-300 bg-white"
        onPointerDown={(e) => {
          drawing.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          const [x, y] = point(e)
          const ctx = canvas.current!.getContext('2d')!
          ctx.strokeStyle = ink
          ctx.beginPath()
          ctx.moveTo(x, y)
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return
          const [x, y, p] = point(e)
          const ctx = canvas.current!.getContext('2d')!
          ctx.lineWidth = 1.5 + p * 2.5
          ctx.lineTo(x, y)
          ctx.stroke()
          setDirty(true)
        }}
        onPointerUp={() => (drawing.current = false)}
      />
      <p className="text-xs text-ink-500">{t('card.signHere')}</p>
      <div className="flex gap-2">
        <button type="button" className="btn border border-cream-300" onClick={() => {
          const c = canvas.current!
          c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
          setDirty(false)
        }}>
          {t('card.clear')}
        </button>
        <button type="button" className="btn-primary" disabled={!dirty} onClick={() => canvas.current!.toBlob((b) => b && onSave(b), 'image/png')}>
          {t('card.saveSignature')}
        </button>
      </div>
    </div>
  )
}
