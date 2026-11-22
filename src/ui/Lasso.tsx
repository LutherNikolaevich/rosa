import { useEffect, useRef, useState, type RefObject } from 'react'
import { useEditor } from '../state/store'
import { pointerFlags } from '../scene/interaction/drag'
import { sceneApi, setControlsEnabled } from '../scene/sceneApi'

const inside = (x: number, y: number, poly: [number, number][]) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

export function Lasso({ target, enabled }: { target: RefObject<HTMLElement | null>; enabled: boolean }) {
  const [points, setPoints] = useState<[number, number][]>([])
  const active = useRef(false)
  useEffect(() => {
    const el = target.current
    if (!el) return
    const capture = (e: PointerEvent) => {
      pointerFlags.flowerHit = false
      if (e.shiftKey || enabled) setControlsEnabled(false)
    }
    const down = (e: PointerEvent) => {
      if (pointerFlags.flowerHit || !(e.shiftKey || enabled) || e.button !== 0) {
        if (!pointerFlags.flowerHit) setControlsEnabled(true)
        return
      }
      active.current = true
      setPoints([[e.clientX, e.clientY]])
    }
    const move = (e: PointerEvent) => active.current && setPoints((p) => [...p, [e.clientX, e.clientY]])
    const up = (e: PointerEvent) => {
      if (!active.current) return
      active.current = false
      setControlsEnabled(true)
      setPoints((poly) => {
        if (poly.length > 4 && sceneApi.project) {
          const { doc, selectMany, selected } = useEditor.getState()
          const hits = doc.items.filter((i) => !i.hidden && (() => {
            const p = sceneApi.project!(i.p)
            return inside(p.x, p.y, poly)
          })()).map((i) => i.id)
          selectMany(e.shiftKey ? [...new Set([...selected, ...hits])] : hits)
        }
        return []
      })
    }
    el.addEventListener('pointerdown', capture, true)
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', capture, true)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [target, enabled])
  if (points.length < 2) return null
  return (
    <svg className="pointer-events-none fixed inset-0 z-30 h-full w-full" aria-hidden>
      <polygon points={points.map((p) => p.join(',')).join(' ')} fill="rgba(217,79,115,0.08)" stroke="#d94f73" strokeWidth={1.5} strokeDasharray="5 4" />
    </svg>
  )
}
