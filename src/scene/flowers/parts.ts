import { CylinderGeometry, Euler, IcosahedronGeometry, Matrix4, SphereGeometry, TorusGeometry, Vector3, CatmullRomCurve3, TubeGeometry } from 'three'
import type { Rng } from '@/src/state/random'
import { Builder, at, lerp, mix, orient, petal, petals, petalPaint, rgb, shade, type PartKind, type PetalShape, type Rgb } from './geo'

export const LEAF = rgb('#3f6f3a')
export const LEAF_LIGHT = rgb('#86b46a')
export const STEM = rgb('#4b7a3e')
export const YELLOW = rgb('#f2c230')
export const BROWN = rgb('#4a2e1a')

export function sepals(b: Builder, rng: Rng, count = 5, len = 0.09, open = 1.9, radius = 0.02) {
  petals(b, { count, shape: () => ({ len, width: len * 0.45, tip: 1, base: 0.4, cup: -0.3, curl: 0.6 }), open: () => open, radius: () => radius, height: () => -0.01 }, rng, () => petalPaint(LEAF, LEAF_LIGHT, rng, { baseDark: 0.8 }), 'green')
  b.add(new SphereGeometry(0.035, 10, 8), at(0, -0.02, 0, 1, 0.9, 1), shade(STEM, 0.95), 'green')
}

export function disk(b: Builder, rng: Rng, radius: number, height: number, inner: Rgb, outer: Rgb, y = 0) {
  const seeds = rng() * 10
  b.add(new SphereGeometry(radius, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), at(0, y, 0, 1, height / radius, 1), (u, v) => {
    const r = 1 - v
    const speck = 0.85 + 0.15 * Math.sin(u * 220 + r * 60 + seeds)
    return shade(mix(inner, outer, Math.pow(1 - v, 1.5)), speck)
  })
}

export function stamens(b: Builder, rng: Rng, count: number, len: number, spread: number, filament: Rgb, anther: Rgb, y = 0) {
  for (let i = 0; i < count; i++) {
    const az = (i / count) * Math.PI * 2 + rng() * 0.3
    const dir = new Vector3(Math.sin(az) * spread, 1, Math.cos(az) * spread).normalize()
    const l = len * (0.85 + rng() * 0.3)
    const m = orient(new Vector3(0, y, 0), dir)
    m.multiply(at(0, l / 2, 0))
    b.add(new CylinderGeometry(0.004, 0.006, l, 5, 1, true), m, filament)
    const tipPos = dir.clone().multiplyScalar(l).add(new Vector3(0, y, 0))
    b.add(new SphereGeometry(0.014, 7, 5), orient(tipPos, dir, 1).multiply(at(0, 0, 0, 0.7, 1.4, 0.7)), anther)
  }
}

export function curve(points: [number, number, number][], radius: number, segments = 16) {
  return new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(...p))), segments, radius, 5, false)
}

export function blob(b: Builder, x: number, y: number, z: number, r: number, color: Rgb, kind: PartKind = 'petal', detail = 0) {
  b.add(new IcosahedronGeometry(r, detail), at(x, y, z), color, kind)
}

export function leafAt(b: Builder, rng: Rng, matrix: Matrix4, shape: PetalShape, c0 = LEAF, c1 = LEAF_LIGHT) {
  b.add(petal({ fold: 0.25, cup: -0.15, base: 0.45, tip: 0.8, nu: 4, nv: 8, ...shape }, rng), matrix, petalPaint(c0, c1, rng, { baseDark: 0.85, tipFrom: 0.2 }), 'green')
}

export function branchLeaves(b: Builder, rng: Rng, length: number, pairs: number, shape: (t: number) => PetalShape, opts: { alternate?: boolean; angle?: number; c0?: Rgb; c1?: Rgb; bend?: number } = {}) {
  const bend = opts.bend ?? 0.15
  const spinePoint = (t: number): [number, number, number] => [0, t * length, Math.sin(t * Math.PI * 0.5) * bend * length]
  b.add(curve([0, 0.25, 0.5, 0.75, 1].map(spinePoint), 0.007), new Matrix4(), STEM, 'green')
  for (let i = 0; i < pairs; i++) {
    const t = (i + 0.5) / pairs
    const [x, y, z] = spinePoint(t)
    const sides = opts.alternate ? [i % 2 ? 1 : -1] : [1, -1]
    for (const side of sides) {
      const m = at(x, y, z, 1, 1, 1, new Euler(0.2, side * (Math.PI / 2) + (rng() - 0.5) * 0.4, -side * (opts.angle ?? 0.9)))
      leafAt(b, rng, m, shape(t), opts.c0, opts.c1)
    }
  }
}

export function tinyFlower(b: Builder, rng: Rng, matrix: Matrix4, count: number, size: number, c0: Rgb, c1: Rgb, eye: Rgb, open = 1.35) {
  for (let i = 0; i < count; i++) {
    const az = (i / count) * Math.PI * 2
    const m = matrix.clone().multiply(new Matrix4().makeRotationY(az)).multiply(new Matrix4().makeRotationX(-open))
    b.add(petal({ len: size, width: size * 0.95, base: 0.35, tip: 0.25, cup: 0.25, nu: 3, nv: 4 }, rng), m, petalPaint(c0, c1, rng, { baseDark: 0.9 }))
  }
  b.add(new SphereGeometry(size * 0.28, 6, 4), matrix.clone().multiply(at(0, size * 0.05, 0)), eye)
}

export const torus = (r: number, tube: number, arc = Math.PI * 2) => new TorusGeometry(r, tube, 6, 24, arc)
export { lerp, mix }
