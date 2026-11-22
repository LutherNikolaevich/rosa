import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, CylinderGeometry, DoubleSide, Group, LatheGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, TorusGeometry, Vector2, Vector3, type Material } from 'three'
import { mulberry32 } from '@/src/state/random'
import { type Bouquet } from '@/src/state/schema'
import { grid } from '../flowers/geo'
import { paperTexture } from './textures'
import { useFontReady } from '../fonts'
import { progress, revealTime, UNFOLD_END, UNFOLD_START } from '../animation/reveal'

export const WRAP_BOTTOM = -2.55
export const WRAP_TOP = -0.45
const R_BOTTOM = 0.1
const R_TOP = 1.1

export const TIE_Y = -1.78

export const wrapRadiusAt = (y: number) => {
  const v = Math.min(1, Math.max(0, (y - WRAP_BOTTOM) / (WRAP_TOP - WRAP_BOTTOM)))
  return R_BOTTOM + (R_TOP - R_BOTTOM) * Math.pow(v, 0.8)
}

const TIE_RADIUS = wrapRadiusAt(TIE_Y)
const gatheredRadius = (y: number, layer: number) => TIE_RADIUS * (0.9 + 0.1 * layer) + Math.max(0, Math.abs(y - TIE_Y) - 0.07) * 1.6

type Top = 'point' | 'scallop' | 'straight' | 'fray'

interface SheetSpec {
  from: number
  to: number
  topY: number
  top: Top
  radius: number
  crinkle: number
  flare: number
  seed: number
}

function sheetGeometry(spec: SheetSpec) {
  const rng = mulberry32(spec.seed)
  const phases = [rng() * 6, rng() * 6, rng() * 6]
  return grid(36, 24, (u, v) => {
    const a = spec.from + ((u + 1) / 2) * (spec.to - spec.from)
    const topShape = spec.top === 'point' ? 0.42 * (1 - Math.abs(u)) : spec.top === 'scallop' ? 0.07 * Math.cos(u * Math.PI * 3) : spec.top === 'fray' ? 0.03 * Math.sin(u * 90) : 0
    const backRise = -0.14 * Math.cos(a)
    const y = WRAP_BOTTOM + (spec.topY + topShape + backRise - WRAP_BOTTOM) * v
    const crinkle = spec.crinkle * 0.035 * (Math.sin(u * 13 + phases[0] + v * 4) * Math.cos(v * 17 + phases[1]) + 0.5 * Math.sin(u * 31 + v * 23 + phases[2])) * v
    const folds = 0.025 * Math.sin(u * 9 + phases[2]) * v
    const radius = (R_BOTTOM + (R_TOP * spec.radius - R_BOTTOM) * Math.pow(v, 0.8)) * (1 + crinkle + folds) + spec.flare * Math.pow(v, 5)
    const below = Math.max(0, TIE_Y - y) / (TIE_Y - WRAP_BOTTOM)
    const pouch = (TIE_RADIUS * (0.9 + 0.1 * spec.radius) + 0.25 * Math.sin(below * Math.PI * 0.6) * (1 + crinkle + folds))
    const gathered = below > 0 ? pouch : Math.min(radius, gatheredRadius(y, spec.radius))
    return [Math.sin(a) * gathered, y, Math.cos(a) * gathered]
  })
}

interface Sheet extends SheetSpec {
  material: Material
}

function paperMaterial(wrap: Bouquet['wrap'], index: number, rich: boolean, fontsReady: number): Material {
  const color = wrap.colors[index % wrap.colors.length]
  const accent = wrap.colors[(index + 1) % wrap.colors.length]
  const map = wrap.t === 'cellophane' ? null : paperTexture(wrap, color, accent, fontsReady)
  map?.repeat.set(2, 1.5)
  const common = { side: DoubleSide, map }
  switch (wrap.t) {
    case 'cellophane':
      return new MeshPhysicalMaterial({ ...common, color, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0, clearcoat: 1, iridescence: rich ? 0.8 : 0, depthWrite: false })
    case 'tissue':
      return new MeshStandardMaterial({ ...common, roughness: 0.85 })
    case 'silk':
      return new MeshPhysicalMaterial({ ...common, roughness: 0.45, sheen: 1, sheenRoughness: 0.35, sheenColor: '#ffffff' })
    case 'korean':
      return new MeshPhysicalMaterial({ ...common, roughness: 0.6, sheen: 0.4, sheenColor: '#ffffff' })
    default:
      return new MeshStandardMaterial({ ...common, roughness: wrap.t === 'burlap' ? 1 : 0.88 })
  }
}

function paperSheets(wrap: Bouquet['wrap'], seed: number, rich: boolean, fontsReady: number): Sheet[] {
  const rng = mulberry32(seed + 3)
  const crinkle = wrap.crinkle * (wrap.t === 'tissue' ? 1.6 : wrap.t === 'silk' ? 0.4 : 1)
  const layers = wrap.layers
  if (wrap.t === 'korean')
    return Array.from({ length: layers + 1 }, (_, i) => {
      const center = i === layers ? 0 : Math.PI + (layers > 1 ? (i / (layers - 1) - 0.5) * 2.6 : 0) + (rng() - 0.5) * 0.3
      const span = i === layers ? Math.PI * 0.62 : 1.25 + rng() * 0.3
      return { from: center - span, to: center + span, topY: i === layers ? WRAP_TOP - 0.05 : WRAP_TOP + 0.05 - i * 0.05, top: 'point' as Top, radius: 1.02 + i * 0.05, crinkle, flare: 0.05 + i * 0.03, seed: seed + i, material: paperMaterial(wrap, i, rich, fontsReady) }
    })
  const top: Top = wrap.t === 'burlap' ? 'fray' : wrap.t === 'cellophane' ? 'point' : wrap.t === 'newspaper' ? 'straight' : 'scallop'
  const sheets: Sheet[] = Array.from({ length: layers }, (_, i) => {
    const offset = (i % 2 ? 1 : -1) * 0.25 + (rng() - 0.5) * 0.2
    const gap = wrap.t === 'cellophane' ? 0.3 : 0.35
    return { from: offset + Math.PI + gap, to: offset + Math.PI * 3 - gap, topY: WRAP_TOP + (wrap.t === 'cellophane' ? 0.4 : 0) - i * 0.06, top, radius: 1 + i * 0.06 + (wrap.t === 'cellophane' ? 0.12 : 0), crinkle, flare: 0.08, seed: seed + i * 7, material: paperMaterial(wrap, i, rich, fontsReady) }
  })
  if (wrap.t === 'cellophane') sheets.unshift({ from: Math.PI + 0.35, to: Math.PI * 3 - 0.35, topY: WRAP_TOP - 0.1, top: 'scallop', radius: 0.97, crinkle, flare: 0.05, seed: seed + 99, material: paperMaterial({ ...wrap, t: 'tissue' }, 0, rich, fontsReady) })
  return sheets
}

const axis = new Vector3()
const quaternion = new Quaternion()

function PaperWrap({ wrap, seed, rich }: { wrap: Bouquet['wrap']; seed: number; rich: boolean }) {
  const fontsReady = useFontReady(wrap.font)
  const sheets = useMemo(() => paperSheets(wrap, seed, rich, fontsReady), [wrap, seed, rich, fontsReady])
  const geometries = useMemo(() => sheets.map(sheetGeometry), [sheets])
  const groups = useRef<(Group | null)[]>([])
  useFrame(() => {
    const k = progress(revealTime(), UNFOLD_START, UNFOLD_END)
    sheets.forEach((sheet, i) => {
      const g = groups.current[i]
      if (!g) return
      const center = (sheet.from + sheet.to) / 2
      axis.set(Math.cos(center), 0, -Math.sin(center))
      g.quaternion.copy(quaternion.setFromAxisAngle(axis, -0.4 * (1 - k)))
    })
  })
  return (
    <>
      {sheets.map((sheet, i) => (
        <group key={i} ref={(g) => void (groups.current[i] = g)} position={[0, WRAP_BOTTOM, 0]}>
          <mesh geometry={geometries[i]} material={sheet.material} position={[0, -WRAP_BOTTOM, 0]} castShadow={wrap.t !== 'cellophane'} receiveShadow renderOrder={wrap.t === 'cellophane' ? 2 : 0} />
        </group>
      ))}
    </>
  )
}

const lathe = (points: [number, number][], segments = 48) => new LatheGeometry(points.map(([x, y]) => new Vector2(x, y)), segments)

const CONTAINER_REPEAT: Partial<Record<Bouquet['wrap']['t'], [number, number]>> = { 'hat-box': [6, 1], 'ceramic-vase': [3, 2], 'wooden-box': [2, 1] }

function Container({ wrap, rich }: { wrap: Bouquet['wrap']; rich: boolean }) {
  const [c0, c1 = c0] = wrap.colors
  const fontsReady = useFontReady(wrap.font)
  const map = useMemo(() => {
    if (wrap.pattern === 'none') return null
    const texture = paperTexture(wrap, c0, c1, fontsReady)
    const [u, v] = CONTAINER_REPEAT[wrap.t] ?? [1, 1]
    texture.repeat.set(u, v)
    return texture
  }, [wrap, c0, c1, fontsReady])
  if (wrap.t === 'wooden-box') {
    const wood = new MeshStandardMaterial({ color: c0, roughness: 0.75, map })
    const planks: [number, number, number, number, number, number][] = [
      [0, -1.9, 0.92, 1.95, 0.9, 0.08],
      [0, -1.9, -0.92, 1.95, 0.9, 0.08],
      [0.94, -1.9, 0, 0.08, 0.9, 1.84],
      [-0.94, -1.9, 0, 0.08, 0.9, 1.84],
      [0, -2.33, 0, 1.84, 0.06, 1.84],
    ]
    return (
      <>
        {planks.map(([x, y, z, w, h, d], i) => (
          <mesh key={i} position={[x, y, z]} material={wood} castShadow receiveShadow geometry={new BoxGeometry(w, h, d)} />
        ))}
        <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.8, 1.8]} />
          <meshStandardMaterial color="#5d4630" roughness={1} />
        </mesh>
      </>
    )
  }
  if (wrap.t === 'hat-box')
    return (
      <>
        <mesh position={[0, -1.95, 0]} geometry={new CylinderGeometry(1.05, 1.05, 1.1, 64, 1, true)} castShadow receiveShadow>
          <meshPhysicalMaterial color={c0} map={map} roughness={0.8} sheen={1} sheenColor="#ffffff" side={DoubleSide} />
        </mesh>
        <mesh position={[0, -1.42, 0]} geometry={new TorusGeometry(1.06, 0.035, 8, 64)} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={c1} roughness={0.5} />
        </mesh>
        <mesh position={[0, -1.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.04, 48]} />
          <meshStandardMaterial color="#4f6b3f" roughness={1} />
        </mesh>
      </>
    )
  if (wrap.t === 'glass-vase')
    return (
      <>
        <mesh geometry={lathe([[0.01, -2.6], [0.55, -2.58], [0.62, -2.3], [0.52, -1.8], [0.36, -1.35], [0.42, -1.1], [0.47, -1.05]])} renderOrder={2}>
          {rich ? <meshPhysicalMaterial transmission={1} thickness={0.25} roughness={0.04} ior={1.45} color={c0} side={DoubleSide} /> : <meshPhysicalMaterial transparent opacity={0.25} roughness={0.05} clearcoat={1} color={c0} side={DoubleSide} depthWrite={false} />}
        </mesh>
        <mesh geometry={lathe([[0.01, -2.56], [0.54, -2.54], [0.59, -2.3], [0.5, -1.85], [0.43, -1.7], [0.01, -1.7]])} renderOrder={1}>
          <meshPhysicalMaterial transparent opacity={0.18} color="#cfe8f2" roughness={0.1} depthWrite={false} />
        </mesh>
      </>
    )
  if (wrap.t === 'ceramic-vase')
    return (
      <mesh geometry={lathe([[0.01, -2.6], [0.4, -2.58], [0.62, -2.1], [0.6, -1.7], [0.38, -1.3], [0.36, -1.1], [0.44, -1.02], [0.4, -1.0]])} castShadow receiveShadow>
        <meshPhysicalMaterial color={c0} map={map} roughness={0.25} clearcoat={0.8} side={DoubleSide} />
      </mesh>
    )
  if (wrap.t === 'basket') {
    const weave = paperTexture({ ...wrap, t: 'burlap', pattern: 'none' }, c0, c1)
    weave.repeat.set(6, 2)
    return (
      <>
        <mesh geometry={lathe([[0.01, -2.6], [0.85, -2.58], [1.05, -2.0], [1.12, -1.5], [1.15, -1.45]])} castShadow receiveShadow>
          <meshStandardMaterial color={c0} map={weave} roughness={1} side={DoubleSide} />
        </mesh>
        <mesh position={[0, -1.45, -0.05]} geometry={new TorusGeometry(1.12, 0.045, 8, 48, Math.PI)} castShadow>
          <meshStandardMaterial color={c0} map={weave} roughness={1} />
        </mesh>
      </>
    )
  }
  return null
}

export const isContainer = (t: Bouquet['wrap']['t']) => ['wooden-box', 'hat-box', 'glass-vase', 'ceramic-vase', 'basket'].includes(t)

export const Wrap = memo(function Wrap({ wrap, seed, rich }: { wrap: Bouquet["wrap"]; seed: number; rich: boolean }) {
  if (wrap.t === 'none') return null
  return isContainer(wrap.t) ? <Container wrap={wrap} rich={rich} /> : <PaperWrap wrap={wrap} seed={seed} rich={rich} />
})
