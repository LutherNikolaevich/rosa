import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshPhysicalMaterial, MeshStandardMaterial, type Group } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Bouquet } from '@/src/state/schema'
import { LID_END, UNTIE_END, progress, revealTime } from '../animation/reveal'
import { useFontReady } from '../fonts'
import { boxFaceTextures, paperTexture } from './textures'
import { strip, useRibbonMaterial } from './Ribbon'

type Vec = [number, number, number]

const LID_Y = 1.55
const HEIGHT_SCALE = 1.1
const BASE_Y = -2.62 + 1.35 * HEIGHT_SCALE
const FALL_END = LID_END + 0.8
const RETRACT = 0.3
const WALL_REST_ANGLE = 1.2
const SIZE = 2.7
const HALF = SIZE / 2
const WALL = 0.05
const LID_H = 0.4
const LID_W = SIZE + 0.12
const BAND_DEPTH = 0.014
const BAND = 0.34
const LID_TOP = LID_H / 2 + BAND_DEPTH * 2
const TAU = Math.PI * 2
const easeIn = (x: number) => x * x * x
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)

function bowLoop(side: 1 | -1) {
  const reach = 0.74
  const rise = 0.26
  const height = 0.21
  const path = (v: number): Vec => {
    const a = v * TAU
    const out = (1 - Math.cos(a)) / 2
    return [side * (0.08 + reach * out), 0.13 + height * Math.sin(a) * (0.3 + 0.7 * out) + rise * out, 0]
  }
  const centroid = [side * (0.08 + reach * 0.5), 0.13 + rise * 0.5]
  return strip(
    56,
    (u, v) => {
      const p = path(v)
      const ahead = path(Math.min(1, v + 0.002))
      const behind = path(Math.max(0, v - 0.002))
      const len = Math.hypot(ahead[0] - behind[0], ahead[1] - behind[1]) || 1
      let nx = (ahead[1] - behind[1]) / len
      let ny = -(ahead[0] - behind[0]) / len
      if (nx * (p[0] - centroid[0]) + ny * (p[1] - centroid[1]) < 0) [nx, ny] = [-nx, -ny]
      const out = (1 - Math.cos(v * TAU)) / 2
      const half = (BAND / 2) * (0.45 + 0.55 * Math.sqrt(out))
      const puff = 0.08 * (1 - u * u) * Math.sqrt(out) + 0.03 * Math.sin(u * Math.PI * 2.5) * (1 - out) ** 3
      const tilt = 0.55
      return [p[0] + nx * (puff + Math.sin(tilt) * u * half), p[1] + ny * (puff + Math.sin(tilt) * u * half), Math.cos(tilt) * u * half]
    },
    [0, 1],
  )
}

function bowKnot() {
  return strip(
    32,
    (u, v) => {
      const a = v * TAU
      const r = 0.1 * (1 + 0.25 * (1 - u * u))
      return [u * 0.15, 0.13 + Math.sin(a) * r * 0.85, Math.cos(a) * r]
    },
    [0, 1],
  )
}

function bowTail(side: 1 | -1, drop: number) {
  const top = LID_W / 2
  const total = top + drop
  const notch = 0.12 / total
  return strip(
    48,
    (u, v) => {
      const q = v - notch * (1 - Math.abs(u)) * Math.max(0, (v - (1 - notch)) / notch)
      const d = q * total
      const flat = Math.min(d, top)
      const over = Math.max(0, d - top)
      const bend = Math.min(1, over / 0.06)
      const twist = side * 0.55 * Math.min(1, over / drop) ** 1.5
      const x = side * (0.03 + 0.34 * (flat / top) ** 0.8 + 0.05 * over)
      const y = 0.006 + 0.008 * Math.sin(d * 7 + side) * (1 - bend) - over
      const z = flat + 0.03 * bend + 0.05 * over * over
      const half = (BAND / 2) * (0.55 + 0.45 * Math.min(1, d / 0.25))
      return [x + Math.cos(twist) * u * half, y, z - Math.sin(twist) * u * half]
    },
    [0, 1],
  )
}

const WALLS: { pos: Vec; dims: Vec; band: Vec; out: Vec; faces: [number, number] }[] = [
  { pos: [0, 0, HALF], dims: [SIZE, SIZE, WALL], band: [BAND, SIZE, BAND_DEPTH], out: [0, 0, 1], faces: [4, 5] },
  { pos: [0, 0, -HALF], dims: [SIZE, SIZE, WALL], band: [BAND, SIZE, BAND_DEPTH], out: [0, 0, -1], faces: [5, 4] },
  { pos: [HALF, 0, 0], dims: [WALL, SIZE, SIZE], band: [BAND_DEPTH, SIZE, BAND], out: [1, 0, 0], faces: [0, 1] },
  { pos: [-HALF, 0, 0], dims: [WALL, SIZE, SIZE], band: [BAND_DEPTH, SIZE, BAND], out: [-1, 0, 0], faces: [1, 0] },
]
const LID_FACE = 2

type Skin = { lid: MeshPhysicalMaterial; wall: MeshPhysicalMaterial; side: MeshPhysicalMaterial; inner: MeshStandardMaterial }
const faceMaterials = (outerMaterial: MeshPhysicalMaterial, skin: Skin, outer: number, inner = -1) => Array.from({ length: 6 }, (_, i) => (i === outer ? outerMaterial : i === inner ? skin.inner : skin.side))

function useBoxSkin(wrap: Bouquet['wrap'], fontsReady: number): Skin {
  const skin = useMemo(() => {
    const lid = boxFaceTextures(wrap, fontsReady)
    const wall = boxFaceTextures(wrap, fontsReady, true)
    const sideMap = paperTexture(wrap, wrap.colors[0], wrap.colors[1] ?? wrap.colors[0], fontsReady).clone()
    sideMap.repeat.set(2, (2 * LID_H) / LID_W)
    sideMap.needsUpdate = true
    const paper = { roughness: 0.72, sheen: 0.25, sheenRoughness: 0.6, sheenColor: '#ffffff' }
    return {
      lid: new MeshPhysicalMaterial({ ...paper, map: lid.map, bumpMap: lid.bump, bumpScale: 2 }),
      wall: new MeshPhysicalMaterial({ ...paper, map: wall.map, bumpMap: wall.bump, bumpScale: 2 }),
      side: new MeshPhysicalMaterial({ ...paper, map: sideMap }),
      inner: new MeshStandardMaterial({ color: wrap.colors[1] ?? '#fffaf3', roughness: 0.9 }),
    }
  }, [wrap, fontsReady])
  useEffect(
    () => () => {
      skin.side.map?.dispose()
      Object.values(skin).forEach((m) => m.dispose())
    },
    [skin],
  )
  return skin
}

function useSatin(ribbon: Bouquet['ribbon'], font: Bouquet['wrap']['font']) {
  const base = useRibbonMaterial(ribbon, font)
  const satin = useMemo(() => {
    const m = base.clone()
    if (ribbon.t === 'twine' || ribbon.t === 'lace') return m
    m.clearcoat = 0
    m.roughness = 0.4
    m.anisotropy = 0.8
    m.sheen = 0.7
    m.sheenRoughness = 0.28
    return m
  }, [base, ribbon.t])
  useEffect(() => () => satin.dispose(), [satin])
  return satin
}

export function GiftBox({ wrap, ribbon, idleSpin }: { wrap: Bouquet['wrap']; ribbon: Bouquet['ribbon']; idleSpin?: boolean }) {
  const root = useRef<Group>(null)
  const lid = useRef<Group>(null)
  const bow = useRef<Group>(null)
  const tails = useRef<Group>(null)
  const walls = useRef<(Group | null)[]>([])
  const fontsReady = useFontReady(wrap.font)
  const satin = useSatin(ribbon, wrap.font)
  const skin = useBoxSkin(wrap, fontsReady)
  const geometry = useMemo(
    () => ({
      lid: new RoundedBoxGeometry(LID_W, LID_H, LID_W, 3, 0.035),
      front: new RoundedBoxGeometry(SIZE, SIZE, WALL, 2, 0.02),
      side: new RoundedBoxGeometry(WALL, SIZE, SIZE, 2, 0.02),
      loops: [bowLoop(1), bowLoop(-1)],
      knot: bowKnot(),
      tails: [bowTail(-1, 0.62), bowTail(1, 0.5)],
    }),
    [],
  )
  useEffect(() => () => Object.values(geometry).flat().forEach((g) => g.dispose()), [geometry])
  useFrame((state) => {
    const t = revealTime()
    if (!root.current) return
    if (t === Infinity) {
      root.current.visible = !!idleSpin
      if (idleSpin) root.current.rotation.y = state.clock.elapsedTime * 0.3
      return
    }
    const untie = progress(t, 0, UNTIE_END)
    const lift = progress(t, UNTIE_END * 0.6, LID_END)
    const fall = easeInOut(progress(t, LID_END * 0.75, FALL_END))
    const retract = easeInOut(progress(t, FALL_END, FALL_END + RETRACT))
    root.current.visible = retract < 1
    root.current.position.y = BASE_Y + (t === 0 ? Math.sin(state.clock.elapsedTime * 2) * 0.03 : 0)
    root.current.rotation.z = Math.sin(untie * Math.PI * 3) * (1 - untie) * 0.035
    if (bow.current) {
      bow.current.scale.setScalar(Math.max(0.001, 1 - easeIn(untie)))
      bow.current.rotation.y = untie * 4
      bow.current.position.y = LID_TOP + untie * 0.5
    }
    if (tails.current) tails.current.scale.setScalar(Math.max(0.001, 1 - untie))
    if (lid.current) {
      lid.current.position.y = LID_Y + Math.sin(untie * Math.PI) * 0.08 + easeIn(lift) * 4
      lid.current.rotation.x = -lift * 0.9
    }
    walls.current.forEach((w, i) => {
      if (!w) return
      w.rotation.x = (i < 2 ? (i ? -1 : 1) : 0) * fall * WALL_REST_ANGLE
      w.rotation.z = (i >= 2 ? (i === 2 ? -1 : 1) : 0) * fall * WALL_REST_ANGLE
      w.scale.setScalar(Math.max(0.001, 1 - retract))
    })
  })
  const bandOffset = (WALL + BAND_DEPTH) / 2
  return (
    <group ref={root} position={[0, BASE_Y, 0]} scale={[1, HEIGHT_SCALE, 1]}>
      {WALLS.map((w, i) => (
        <group key={i} ref={(g) => void (walls.current[i] = g)} position={[w.pos[0], -HALF, w.pos[2]]}>
          <mesh position={[0, HALF, 0]} geometry={i < 2 ? geometry.front : geometry.side} material={faceMaterials(skin.wall, skin, ...w.faces)} castShadow receiveShadow />
          <mesh position={[w.out[0] * bandOffset, HALF, w.out[2] * bandOffset]} material={satin} receiveShadow>
            <boxGeometry args={w.band} />
          </mesh>
        </group>
      ))}
      <group ref={lid} position={[0, LID_Y, 0]}>
        <mesh geometry={geometry.lid} material={faceMaterials(skin.lid, skin, LID_FACE)} castShadow receiveShadow />
        {[0, Math.PI / 2].map((turn, i) => (
          <mesh key={turn} rotation={[0, turn, 0]} material={satin} receiveShadow>
            <boxGeometry args={[BAND, LID_H + BAND_DEPTH * 2 + i * 0.006, LID_W + BAND_DEPTH * 2]} />
          </mesh>
        ))}
        <group ref={tails} position={[0, LID_TOP, 0]}>
          {geometry.tails.map((tail, i) => (
            <mesh key={i} geometry={tail} material={satin} castShadow receiveShadow />
          ))}
        </group>
        <group ref={bow} position={[0, LID_TOP, 0]} rotation={[0.42, 0, 0]}>
          {geometry.loops.map((loop, i) => (
            <mesh key={i} geometry={loop} material={satin} rotation={[0, (i ? 1 : -1) * 0.32, 0]} castShadow receiveShadow />
          ))}
          <mesh geometry={geometry.knot} material={satin} castShadow />
        </group>
      </group>
    </group>
  )
}
