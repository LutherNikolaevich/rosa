import { Euler, Quaternion, Vector3 } from 'three'
import { SPECIES } from '@/src/state/species'
import { mulberry32, type Rng } from '@/src/state/random'
import { type Item, type Style } from '@/src/state/schema'

type Vec = [number, number, number]
interface Slot {
  p: Vector3
  dir: Vector3
}

export const TIE_POINT = new Vector3(0, -1.55, 0)
const DOME_CENTER = new Vector3(0, -0.85, 0)
const FOCUS_ORIGIN = new Vector3(0, -1.5, 0)
const UP = new Vector3(0, 1, 0)
const GOLDEN = 2.39996323

export const footprint = (item: Pick<Item, 't' | 's'>) => SPECIES[item.t].scale * item.s * (SPECIES[item.t].category === 'filler' ? 0.2 : 0.24)

const sphereSlot = (theta: number, phi: number, radius: number, center = DOME_CENTER): Slot => {
  const p = new Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)).multiplyScalar(radius).add(center)
  return { p, dir: p.clone().sub(FOCUS_ORIGIN).normalize() }
}

const facing = (p: Vector3, forward: Vector3, blend: number): Slot => ({ p, dir: p.clone().sub(FOCUS_ORIGIN).normalize().lerp(forward, blend).normalize() })

const domeRadius = (n: number) => 0.62 + 0.085 * Math.sqrt(n)

function domeSlots(n: number, rng: Rng, opts: { maxTheta: number; radius: number; jitter: number }): Slot[] {
  return Array.from({ length: n }, (_, i) => {
    const k = n === 1 ? 0 : (i + 0.5) / n
    const theta = Math.acos(1 - k * (1 - Math.cos(opts.maxTheta)))
    const r = opts.radius * (1 + (rng() - 0.5) * opts.jitter)
    return sphereSlot(theta, i * GOLDEN + (rng() - 0.5) * opts.jitter, r)
  })
}

const GENERATORS: Record<Style, (n: number, rng: Rng) => Slot[]> = {
  round: (n, rng) => domeSlots(n, rng, { maxTheta: 1.2, radius: domeRadius(n), jitter: 0.05 }),
  posy: (n, rng) => domeSlots(n, rng, { maxTheta: 1.0, radius: domeRadius(n) * 0.78, jitter: 0.03 }),
  'hand-tied': (n, rng) => domeSlots(n, rng, { maxTheta: 1.35, radius: domeRadius(n) * 1.12, jitter: 0.35 }),
  cascade: (n, rng) => {
    const top = Math.ceil(n * 0.62)
    const dome = domeSlots(top, rng, { maxTheta: 1.15, radius: domeRadius(top), jitter: 0.08 })
    const tail = Array.from({ length: n - top }, (_, i) => {
      const t = (i + 1) / (n - top + 1)
      const p = new Vector3((rng() - 0.5) * 0.7 * (1 - t), -0.35 - t * 1.6, 0.75 + t * 0.35 + (rng() - 0.5) * 0.15)
      return facing(p, new Vector3(0, -0.3, 1).normalize(), 0.8)
    })
    return [...dome, ...tail]
  },
  fan: (n, rng) => {
    const rows = Math.max(1, Math.round(Math.sqrt(n / 2.2)))
    const slots: Slot[] = []
    let placed = 0
    for (let row = 0; row < rows; row++) {
      const count = row === rows - 1 ? n - placed : Math.round(n / rows)
      for (let i = 0; i < count; i++) {
        const a = -1.15 + (2.3 * (i + 0.5)) / count + (rng() - 0.5) * 0.06
        const radius = 0.9 + row * 0.42
        const p = new Vector3(Math.sin(a) * radius, -1.25 + Math.cos(a) * radius, 0.15 - row * 0.2)
        slots.push(facing(p, new Vector3(Math.sin(a) * 0.5, 0.35, 1).normalize(), 0.6))
      }
      placed += count
    }
    return slots
  },
  heart: (n, rng) => {
    const inside = (x: number, y: number) => Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y <= 0
    const points: Vector3[] = []
    const outline = Math.min(n, Math.max(6, Math.round(n * 0.6)))
    for (let i = 0; i < outline; i++) {
      const t = (i / outline) * Math.PI * 2
      points.push(new Vector3(16 * Math.pow(Math.sin(t), 3), 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t), 0).multiplyScalar(0.075))
    }
    for (let guard = 0; points.length < n && guard < 5000; guard++) {
      const x = (rng() * 2 - 1) * 1.2
      const y = (rng() * 2 - 1) * 1.2
      if (inside(x, y)) points.push(new Vector3(x, y, 0).multiplyScalar(0.92))
    }
    return points.map((p) => facing(new Vector3(p.x, p.y - 0.15, 0.35 + (rng() - 0.5) * 0.08), new Vector3(0, 0, 1), 0.85))
  },
  single: (n, rng) => [
    { p: new Vector3(0, 0.15, 0.05), dir: new Vector3(0, 1, 0.25).normalize() },
    ...domeSlots(Math.max(0, n - 1), rng, { maxTheta: 1.3, radius: 0.55, jitter: 0.1 }).map((s) => ({ ...s, p: s.p.clone().add(new Vector3(0, -0.2, -0.12)) })),
  ].slice(0, n),
  box: (n, rng) => {
    const cols = Math.ceil(Math.sqrt(n))
    const step = 1.7 / cols
    return Array.from({ length: n }, (_, i) => {
      const x = ((i % cols) + 0.5) * step - 0.85 + (rng() - 0.5) * 0.05
      const z = (Math.floor(i / cols) + 0.5) * step - 0.85 + (rng() - 0.5) * 0.05
      return { p: new Vector3(x, -1.05 + (rng() - 0.5) * 0.06, z), dir: new Vector3(x * 0.25, 1, z * 0.25 + 0.15).normalize() }
    })
  },
}

const priority = (item: Item) => ({ focal: 0, secondary: 1, accent: 2, filler: 3 })[SPECIES[item.t].category]

export function orderForStyle(items: Item[], rng: Rng): Item[] {
  const focal = items.filter((i) => priority(i) <= 1).sort((a, b) => priority(a) - priority(b))
  const rest = items.filter((i) => priority(i) > 1).sort(() => rng() - 0.5)
  if (!focal.length) return rest
  const result: Item[] = []
  const gap = Math.max(1, Math.round(focal.length / Math.max(1, rest.length)))
  focal.forEach((item, i) => {
    result.push(item)
    if (i % gap === gap - 1 && rest.length) result.push(rest.shift()!)
  })
  return [...result, ...rest]
}

export const directionToEuler = (dir: Vector3, twist: number): Vec => {
  const q = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize()).multiply(new Quaternion().setFromAxisAngle(UP, twist))
  const e = new Euler().setFromQuaternion(q)
  return [e.x, e.y, e.z]
}

export const headDirection = (r: Vec) => UP.clone().applyEuler(new Euler(...r))

const round = (v: number) => Math.round(v * 1000) / 1000

export function relax(items: Item[], iterations = 24, keepRadius = true): Item[] {
  const pos = items.map((i) => new Vector3(...i.p))
  const radii = items.map(footprint)
  const shells = pos.map((p) => p.distanceTo(DOME_CENTER))
  for (let it = 0; it < iterations; it++) {
    for (let a = 0; a < pos.length; a++)
      for (let b = a + 1; b < pos.length; b++) {
        const min = (radii[a] + radii[b]) * 0.85
        const delta = pos[b].clone().sub(pos[a])
        const d = delta.length()
        if (d >= min || d === 0) continue
        const push = delta.multiplyScalar(((min - d) / d) * 0.5)
        if (!items[a].locked) pos[a].sub(push)
        if (!items[b].locked) pos[b].add(push)
      }
    if (keepRadius) pos.forEach((p, i) => p.sub(DOME_CENTER).setLength(shells[i]).add(DOME_CENTER))
  }
  return items.map((item, i) => ({ ...item, p: [round(pos[i].x), round(pos[i].y), round(pos[i].z)] as Vec }))
}

const DOME_STYLES = new Set<Style>(['round', 'posy', 'hand-tied'])

export function arrange(items: Item[], style: Style, seed: number): Item[] {
  const movable = items.filter((i) => !i.locked)
  const rng = mulberry32(seed ^ 0x9e3779b9)
  const ordered = orderForStyle(movable, rng)
  const slots = GENERATORS[style](ordered.length, rng)
  const placed = new Map(
    ordered.map((item, i) => {
      const slot = slots[i]
      const twist = rng() * Math.PI * 2
      const lean = style === 'hand-tied' ? 0.25 : 0.08
      const dir = slot.dir.clone().add(new Vector3((rng() - 0.5) * lean, 0, (rng() - 0.5) * lean)).normalize()
      return [item.id, { ...item, p: [slot.p.x, slot.p.y, slot.p.z] as Vec, r: directionToEuler(dir, twist) }]
    }),
  )
  const result = items.map((i) => placed.get(i.id) ?? i)
  return relax(result, 24, DOME_STYLES.has(style))
}

export function nextSlot(items: Item[], style: Style, seed: number): { p: Vec; r: Vec } {
  const rng = mulberry32(seed ^ items.length)
  const candidates = GENERATORS[style](items.length + 1, rng)
  const best = candidates.reduce(
    (acc, slot) => {
      const clearance = Math.min(Infinity, ...items.map((i) => slot.p.distanceTo(new Vector3(...i.p))))
      return clearance > acc.clearance ? { slot, clearance } : acc
    },
    { slot: candidates[0], clearance: -Infinity },
  ).slot
  return { p: [round(best.p.x), round(best.p.y), round(best.p.z)], r: directionToEuler(best.dir, rng() * Math.PI * 2) }
}

export function placeOnDome(point: Vector3): { p: Vec; r: Vec } {
  const dir = point.clone().sub(FOCUS_ORIGIN).normalize()
  return { p: [round(point.x), round(point.y), round(point.z)], r: directionToEuler(dir, Math.random() * Math.PI * 2) }
}

export { DOME_CENTER }

export function overlapScore(items: Item[]): number {
  let worst = 0
  for (let a = 0; a < items.length; a++)
    for (let b = a + 1; b < items.length; b++) {
      const min = (footprint(items[a]) + footprint(items[b])) * 0.85
      const d = new Vector3(...items[a].p).distanceTo(new Vector3(...items[b].p))
      worst = Math.max(worst, (min - d) / min)
    }
  return worst
}
