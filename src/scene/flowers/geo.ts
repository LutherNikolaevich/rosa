import { BufferAttribute, BufferGeometry, Color, Euler, Matrix3, Matrix4, Quaternion, Vector3 } from 'three'
import type { Rng } from '@/src/state/random'

export type Rgb = [number, number, number]
export type Paint = Rgb | ((u: number, v: number) => Rgb)
export type PartKind = 'petal' | 'green' | 'metal' | 'glow' | 'wingL' | 'wingR'

export const rgb = (hex: string): Rgb => {
  const c = new Color(hex)
  return [c.r, c.g, c.b]
}
export const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const shade = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k]
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export class Builder {
  private parts = new Map<PartKind, { pos: number[]; nor: number[]; col: number[]; idx: number[] }>()

  add(geometry: BufferGeometry, matrix: Matrix4, paint: Paint, kind: PartKind = 'petal') {
    const part = this.parts.get(kind) ?? { pos: [], nor: [], col: [], idx: [] }
    this.parts.set(kind, part)
    const base = part.pos.length / 3
    const pos = geometry.getAttribute('position')
    const nor = geometry.getAttribute('normal')
    const uv = geometry.getAttribute('uv')
    const normalMatrix = new Matrix3().getNormalMatrix(matrix)
    const p = new Vector3()
    const n = new Vector3()
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(matrix)
      n.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize()
      part.pos.push(p.x, p.y, p.z)
      part.nor.push(n.x, n.y, n.z)
      const c = typeof paint === 'function' ? paint(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0) : paint
      part.col.push(c[0], c[1], c[2])
    }
    const index = geometry.getIndex()
    if (index) for (let i = 0; i < index.count; i++) part.idx.push(base + index.getX(i))
    else for (let i = 0; i < pos.count; i++) part.idx.push(base + i)
    geometry.dispose()
  }

  build(): Map<PartKind, BufferGeometry> {
    const out = new Map<PartKind, BufferGeometry>()
    for (const [kind, part] of this.parts) {
      const g = new BufferGeometry()
      g.setAttribute('position', new BufferAttribute(new Float32Array(part.pos), 3))
      g.setAttribute('normal', new BufferAttribute(new Float32Array(part.nor), 3))
      g.setAttribute('color', new BufferAttribute(new Float32Array(part.col), 3))
      g.setIndex(part.idx)
      g.computeBoundingSphere()
      out.set(kind, g)
    }
    return out
  }
}

export function grid(nu: number, nv: number, point: (u: number, v: number) => [number, number, number], skip?: (u: number, v: number) => boolean) {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1
      const v = j / nv
      pos.push(...point(u, v))
      uv.push(u, v)
    }
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      if (skip?.((i + 0.5) / nu * 2 - 1, (j + 0.5) / nv)) continue
      const a = j * (nu + 1) + i
      const b = a + nu + 1
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

export interface PetalShape {
  len: number
  width: number
  cup?: number
  curl?: number
  ruffle?: number
  base?: number
  tip?: number
  notch?: number
  fringe?: number
  fold?: number
  nu?: number
  nv?: number
  holes?: (u: number, v: number) => boolean
}

export function petal(shape: PetalShape, rng: Rng) {
  const { len, width, cup = 0.5, curl = 0, ruffle = 0, base = 0.5, tip = 0.4, notch = 0, fringe = 0, fold = 0 } = shape
  const peak = base / (base + tip)
  const norm = Math.pow(peak, base) * Math.pow(1 - peak, tip)
  const phase = rng() * 6.28
  const steps = shape.nv ?? 10
  const spineY: number[] = [0]
  const spineZ: number[] = [0]
  for (let j = 1; j <= steps * 4; j++) {
    const v = j / (steps * 4)
    const angle = curl * v * v
    spineY.push(spineY[j - 1] + (Math.cos(angle) * len) / (steps * 4))
    spineZ.push(spineZ[j - 1] - (Math.sin(angle) * len) / (steps * 4))
  }
  const spine = (v: number) => {
    const k = Math.min(steps * 4, Math.round(v * steps * 4))
    return [spineY[k], spineZ[k]]
  }
  return grid(shape.nu ?? 6, steps, (u, v) => {
    const half = (width / 2) * (Math.pow(Math.max(v, 1e-4), base) * Math.pow(Math.max(1 - v, 0), tip)) / norm
    const [y, z] = spine(v)
    const wave = ruffle * half * Math.sin(u * 7.5 + v * 9 + phase) * Math.pow(v, 1.3)
    const dip = notch * len * Math.pow(1 - Math.abs(u), 3) * smooth(0.8, 1, v)
    const teeth = fringe * len * 0.06 * Math.sin(u * 24 + phase) * smooth(0.75, 1, v)
    const bend = cup * half * u * u + fold * half * Math.abs(u)
    return [u * half, y - dip + teeth, z + bend + wave]
  }, shape.holes)
}

const tmpQ = new Quaternion()
const yAxis = new Vector3(0, 1, 0)

export function placement(azimuth: number, open: number, radius: number, height: number, roll = 0) {
  const m = new Matrix4().makeRotationY(azimuth)
  m.multiply(new Matrix4().makeRotationX(-open))
  m.multiply(new Matrix4().makeRotationZ(roll))
  const outward = new Vector3(Math.sin(azimuth), 0, Math.cos(azimuth)).multiplyScalar(-radius)
  m.setPosition(outward.x, height, outward.z)
  return m
}

export function orient(position: Vector3, direction: Vector3, scale = 1, twist = 0) {
  tmpQ.setFromUnitVectors(yAxis, direction.clone().normalize())
  tmpQ.multiply(new Quaternion().setFromAxisAngle(yAxis, twist))
  return new Matrix4().compose(position, tmpQ, new Vector3(scale, scale, scale))
}

export const at = (x: number, y: number, z: number, sx = 1, sy = sx, sz = sx, rot?: Euler) =>
  new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(rot ?? new Euler()), new Vector3(sx, sy, sz))

export function petalPaint(c0: Rgb, c1: Rgb, rng: Rng, opts: { baseDark?: number; tipFrom?: number } = {}): Paint {
  const jitter = 0.94 + rng() * 0.1
  const baseDark = opts.baseDark ?? 0.65
  const tipFrom = opts.tipFrom ?? 0.5
  return (u, v) => {
    const c = mix(c0, c1, smooth(tipFrom, 1.05, v + Math.abs(u) * 0.15))
    const k = jitter * (baseDark + (1 - baseDark) * smooth(0, 0.4, v)) * (1 - 0.05 * (1 - Math.abs(u)))
    return shade(c, k)
  }
}

export interface RingSpec {
  count: number
  shape: (i: number, t: number) => PetalShape
  open: (t: number) => number
  radius?: (t: number) => number
  height?: (t: number) => number
  phase?: number
  spiral?: boolean
  roll?: number
  matrix?: Matrix4
}

export function petals(b: Builder, spec: RingSpec, rng: Rng, paint: (t: number) => Paint, kind: PartKind = 'petal') {
  const golden = 2.39996323
  for (let i = 0; i < spec.count; i++) {
    const t = spec.count > 1 ? i / (spec.count - 1) : 1
    const azimuth = (spec.spiral ? i * golden : (i / spec.count) * Math.PI * 2) + (spec.phase ?? 0) + (rng() - 0.5) * 0.15
    const geometry = petal(spec.shape(i, t), rng)
    const local = placement(azimuth, spec.open(t) + (rng() - 0.5) * 0.08, spec.radius?.(t) ?? 0.01, spec.height?.(t) ?? 0, (spec.roll ?? 0) * (rng() - 0.5))
    const m = spec.matrix ? spec.matrix.clone().multiply(local) : local
    b.add(geometry, m, paint(t), kind)
  }
}
