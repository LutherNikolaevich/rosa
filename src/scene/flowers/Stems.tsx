import { useMemo } from 'react'
import { BufferGeometry, CatmullRomCurve3, Euler, Matrix4, MeshStandardMaterial, Quaternion, TubeGeometry, Vector3 } from 'three'
import { DoubleSide } from 'three'
import { SPECIES } from '@/src/state/species'
import { itemRng } from '@/src/state/random'
import { type Item } from '@/src/state/schema'
import { Builder, petal, petalPaint, rgb } from './geo'
import { NO_STEM } from './species'
import { windMaterial } from './materials'
import { TIE_POINT } from '../../state/arrange'

const STEM_COLOR = rgb('#4f7a3c')
const LEAF_DARK = rgb('#3b6a35')
const LEAF_LIGHT = rgb('#7fae63')
const UP = new Vector3(0, 1, 0)

const material = windMaterial(new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: DoubleSide }), 'stems')

const stemKey = (i: Item) => `${i.id}:${i.t}:${i.p.join(',')}:${i.r.join(',')}:${i.s}:${i.l}:${i.leaves}`

function buildStem(b: Builder, item: Item, seed: number, sink: number, spread: number) {
  const rng = itemRng(seed + 17, item.id)
  const head = new Vector3(...item.p)
  const axis = UP.clone().applyEuler(new Euler(...item.r))
  const scale = item.s * SPECIES[item.t].scale
  const start = head.clone().addScaledVector(axis, -0.02 * scale)
  const toTie = TIE_POINT.clone().sub(start)
  const bendAmount = Math.min(0.5, toTie.length() * 0.35)
  const control = start.clone().addScaledVector(axis, -bendAmount)
  const through = TIE_POINT.clone().add(new Vector3((rng() - 0.5) * 0.08 + head.x * spread, 0, (rng() - 0.5) * 0.08 + head.z * spread))
  const below = through.clone().sub(control).normalize()
  below.set(below.x * 0.12, -1, below.z * 0.12)
  const end = through.clone().add(below.setLength(0.35 + item.l * sink))
  const curve = new CatmullRomCurve3([start, control.lerp(through, 0.35), through, end])
  const radius = 0.012 * Math.sqrt(scale)
  b.add(new TubeGeometry(curve, 18, radius, 5, false), new Matrix4(), STEM_COLOR, 'green')
  for (let k = 0; k < item.leaves; k++) {
    const t = 0.12 + (k / Math.max(1, item.leaves)) * 0.35 + rng() * 0.05
    const at = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t)
    const side = new Vector3().crossVectors(tangent, new Vector3(rng() - 0.5, 0, rng() - 0.5)).normalize()
    const dir = side.lerp(tangent.clone().negate(), 0.35).normalize()
    const q = new Quaternion().setFromUnitVectors(UP, dir).multiply(new Quaternion().setFromAxisAngle(UP, rng() * Math.PI))
    const len = (0.16 + rng() * 0.08) * Math.sqrt(scale)
    b.add(petal({ len, width: len * 0.45, tip: 0.8, base: 0.45, fold: 0.25, cup: -0.1, curl: 0.5, nu: 4, nv: 7 }, rng), new Matrix4().compose(at, q, new Vector3(1, 1, 1)), petalPaint(LEAF_DARK, LEAF_LIGHT, rng, { baseDark: 0.85, tipFrom: 0.1 }), 'green')
  }
}

export function Stems({ items, seed, sink, spread }: { items: Item[]; seed: number; sink: number; spread: number }) {
  const visible = items.filter((i) => !i.hidden && !NO_STEM.has(i.t))
  const key = visible.map(stemKey).join('|')
  const geometry = useMemo(() => {
    const b = new Builder()
    visible.forEach((item) => buildStem(b, item, seed, sink, spread))
    return b.build().get('green') ?? new BufferGeometry()
  }, [key, seed, sink, spread])
  return <mesh geometry={geometry} material={material} castShadow />
}
