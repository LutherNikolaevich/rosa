import { memo, useMemo } from 'react'
import { CatmullRomCurve3, Color, DoubleSide, MeshPhysicalMaterial, TubeGeometry, Vector3 } from 'three'
import { mulberry32 } from '@/src/state/random'
import { type Bouquet } from '@/src/state/schema'
import { grid } from '../flowers/geo'
import { ribbonTexture } from './textures'
import { useFontReady } from '../fonts'
import { TIE_Y, WRAP_BOTTOM, wrapRadiusAt } from './Wrap'

export { TIE_Y }

type Vec = [number, number, number]
type UvSpan = [number, number]

const HALF_WIDTH = 0.055
const PLAIN: UvSpan = [0.66, 1]
const CORD = 0.012
const TAU = Math.PI * 2

export function strip(steps: number, at: (u: number, v: number) => Vec, span: UvSpan) {
  const geometry = grid(6, steps, at)
  const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 1) / 2, span[0] + (span[1] - span[0]) * uv.getY(i))
  return geometry
}

function cord(path: (v: number) => Vec, closed = false) {
  const points = Array.from({ length: 41 }, (_, i) => new Vector3(...path(i / 40)))
  return new TubeGeometry(new CatmullRomCurve3(points), 96, CORD, 5, closed)
}

function loopPath(side: 1 | -1, size: number) {
  const reach = 0.3 * size
  const height = 0.2 * size
  return (v: number): Vec => {
    const angle = v * TAU
    const out = (1 - Math.cos(angle)) / 2
    return [side * reach * out, height * Math.sin(angle) * (0.25 + 0.75 * out) + 0.25 * reach * out, 0.015 + 0.05 * size * Math.sqrt(out) + 0.015 * Math.sin(angle)]
  }
}

function loopStrip(side: 1 | -1) {
  const path = loopPath(side, 1)
  const tilt = 0.65
  return strip(
    40,
    (u, v) => {
      const p = path(v)
      const ahead = path(Math.min(1, v + 0.001))
      const behind = path(Math.max(0, v - 0.001))
      const tx = ahead[0] - behind[0]
      const ty = ahead[1] - behind[1]
      const len = Math.hypot(tx, ty) || 1
      const half = HALF_WIDTH * (0.45 + 0.55 * Math.sqrt((1 - Math.cos(v * TAU)) / 2)) * u
      return [p[0] - (ty / len) * Math.sin(tilt) * half, p[1] + (tx / len) * Math.sin(tilt) * half, p[2] + Math.cos(tilt) * half]
    },
    PLAIN,
  )
}

function knotStrip() {
  return strip(
    24,
    (u, v) => {
      const a = v * TAU
      return [u * HALF_WIDTH * (0.78 + 0.1 * Math.cos(a)), Math.sin(a) * 0.05, 0.03 + Math.cos(a) * 0.035]
    },
    PLAIN,
  )
}

const POUCH_DEPTH = TIE_Y - WRAP_BOTTOM

function pouchClearance(radius: number) {
  return (drop: number, x: number) => {
    const pouch = wrapRadiusAt(TIE_Y) * 1.03 + 0.28 * Math.sin(Math.min(1, drop / POUCH_DEPTH) * Math.PI * 0.6)
    return Math.sqrt(Math.max(0, pouch * pouch - x * x)) - radius + 0.03
  }
}

function tailPath(length: number, side: 1 | -1, seed: number, clearance = (_drop: number, _x: number) => -Infinity) {
  const phase = mulberry32(seed)() * 6
  const notch = Math.min(0.08, length * 0.12)
  return (u: number, v: number): Vec => {
    const q = v - (notch / length) * (1 - Math.abs(u)) * Math.max(0, (v - 0.85) / 0.15)
    const sway = Math.sin(q * 4 + phase) * 0.06 * q
    const twist = side * 0.35 + Math.sin(q * 3 + phase) * 0.6 * q
    const half = HALF_WIDTH * (0.95 + 0.2 * q) * u
    const x = side * (0.03 + q * 0.16) + sway
    const z = Math.max(0.02 * Math.sin(q * 6), clearance(q * length, x))
    return [x + Math.cos(twist) * half, -q * length, z + Math.sin(twist) * half]
  }
}

function band(radius: number, span: UvSpan) {
  return strip(
    96,
    (u, v) => {
      const a = (v - 0.5) * TAU
      return [Math.sin(a) * radius, u * HALF_WIDTH, Math.cos(a) * radius]
    },
    span,
  )
}

function twineBand(radius: number) {
  return cord((v) => [Math.sin(v * Math.PI * 6) * radius, v * 0.12 - 0.06, Math.cos(v * Math.PI * 6) * radius])
}

export function useRibbonMaterial(ribbon: Bouquet['ribbon'], font: Bouquet['wrap']['font']) {
  const isTwine = ribbon.t === 'twine'
  const lace = ribbon.t === 'lace'
  const fontsReady = useFontReady(font)
  return useMemo(() => {
    const map = isTwine ? null : ribbonTexture(ribbon.c, ribbon.text, font, lace, fontsReady)
    return new MeshPhysicalMaterial({
      color: isTwine ? new Color(ribbon.c).lerp(new Color('#b89a6a'), 0.6) : '#ffffff',
      map,
      roughness: isTwine ? 0.95 : lace ? 0.6 : 0.32,
      clearcoat: isTwine || lace ? 0 : 0.35,
      clearcoatRoughness: 0.3,
      sheen: isTwine ? 0 : 1,
      sheenRoughness: 0.35,
      sheenColor: new Color(ribbon.c).lerp(new Color('#ffffff'), 0.6),
      side: DoubleSide,
      transparent: lace,
      alphaTest: lace ? 0.3 : 0,
    })
  }, [ribbon.c, ribbon.text, font, isTwine, lace, fontsReady])
}

export const Ribbon = memo(function Ribbon({ ribbon, font, container, bare }: { ribbon: Bouquet['ribbon']; font: Bouquet['wrap']['font']; container: boolean; bare: boolean }) {
  const isTwine = ribbon.t === 'twine'
  const radius = bare ? 0.08 : wrapRadiusAt(TIE_Y) * 1.05 + 0.02
  const material = useRibbonMaterial(ribbon, font)
  const tails = ribbon.t === 'long-tails' ? 1.15 * ribbon.len : ribbon.t === 'satin' ? 0 : 0.55 * ribbon.len
  const bow = ribbon.t !== 'satin' && ribbon.t !== 'long-tails'
  const knot = ribbon.t !== 'satin'
  const drape = !bare && !container
  const geometries = useMemo(() => {
    const clearance = drape ? pouchClearance(radius) : undefined
    if (isTwine) {
      const tail = (length: number, side: 1 | -1, seed: number) => {
        const path = tailPath(length, side, seed, clearance)
        return cord((v) => path(0, v))
      }
      return {
        band: twineBand(radius),
        loops: [cord(loopPath(1, 0.75)), cord(loopPath(-1, 0.75))],
        left: tails > 0 ? tail(tails, -1, 11) : null,
        right: tails > 0 ? tail(tails * 0.85, 1, 23) : null,
      }
    }
    return {
      band: band(radius, knot ? PLAIN : [-0.2, 0.8]),
      loops: [loopStrip(1), loopStrip(-1)],
      knot: knotStrip(),
      left: tails > 0 ? strip(32, tailPath(tails, -1, 11, clearance), [0, 1]) : null,
      right: tails > 0 ? strip(32, tailPath(tails * 0.85, 1, 23, clearance), [0, 1]) : null,
    }
  }, [radius, isTwine, tails, knot, drape])
  return (
    <group position={[0, container ? 0.1 : 0, 0]}>
      <mesh geometry={geometries.band} material={material} position={[0, TIE_Y, 0]} castShadow />
      <group position={[0, TIE_Y, radius]}>
        {bow && geometries.loops.map((loop, i) => <mesh key={i} geometry={loop} material={material} castShadow />)}
        {knot &&
          ('knot' in geometries ? (
            <mesh geometry={geometries.knot} material={material} castShadow />
          ) : (
            <mesh position={[0, 0, 0.03]} material={material}>
              <sphereGeometry args={[0.03, 12, 10]} />
            </mesh>
          ))}
        {geometries.left && <mesh geometry={geometries.left} material={material} position={[0, -0.02, 0.025]} castShadow />}
        {geometries.right && <mesh geometry={geometries.right} material={material} position={[0, -0.02, 0.015]} castShadow />}
      </group>
    </group>
  )
})
