import { useEffect } from 'react'
import { SPECIES } from '@/src/state/species'
import { useEditor } from '../state/store'
import { spawnPetals } from '../scene/animation/petals'
import { sfx } from '../audio/synth'

let motionRequested = false

export function triggerShake() {
  const { doc, shake } = useEditor.getState()
  shake()
  sfx('rustle')
  navigator.vibrate?.([20, 40, 20])
  const blooms = doc.items.filter((i) => !i.hidden && SPECIES[i.t].category !== 'accent')
  spawnPetals(blooms.map((i) => ({ p: i.p, color: i.c[0] })), false, 3)
  const request = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
  if (request && !motionRequested) {
    motionRequested = true
    request().catch(() => {})
  }
}

export function useShakeDetector() {
  useEffect(() => {
    let last = 0
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const magnitude = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0)
      const now = performance.now()
      if (magnitude > 24 && now - last > 1200) {
        last = now
        triggerShake()
      }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [])
}
