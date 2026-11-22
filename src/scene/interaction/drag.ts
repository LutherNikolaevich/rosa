import { Euler, Quaternion, Vector3 } from 'three'
import type { Item } from '@/src/state/schema'

export const drag = {
  active: false,
  moved: false,
  anchorId: '',
  radius: 1,
  startDir: new Vector3(),
  startItems: new Map<string, { p: Vector3; q: Quaternion }>(),
  startX: 0,
  startY: 0,
}

export const pointerFlags = { flowerHit: false }

export function beginDrag(anchor: Item, items: Item[], hit: Vector3, center: Vector3, clientX: number, clientY: number) {
  drag.active = true
  drag.moved = false
  drag.anchorId = anchor.id
  drag.radius = hit.distanceTo(center)
  drag.startDir.copy(hit).sub(center).normalize()
  drag.startX = clientX
  drag.startY = clientY
  drag.startItems = new Map(items.map((i) => [i.id, { p: new Vector3(...i.p), q: new Quaternion().setFromEuler(new Euler(...i.r)) }]))
}
