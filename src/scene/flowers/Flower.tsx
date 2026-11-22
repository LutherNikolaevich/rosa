import { memo, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Outlines, useTexture } from '@react-three/drei'
import { Mesh, SRGBColorSpace, Vector3, type Group } from 'three'
import { SPECIES } from '@/src/state/species'
import { type Item } from '@/src/state/schema'
import { flowerParts, quantize } from './build'
import { partMaterial } from './materials'
import { bloomAt } from '../animation/reveal'
import { useEditor } from '../../state/store'
import { mediaUrl, useMedia } from '../../state/media'

export interface FlowerHandlers {
  onPointerDown?: (e: ThreeEvent<PointerEvent>, item: Item) => void
  onDoubleClick?: (e: ThreeEvent<MouseEvent>, item: Item) => void
  onClick?: (e: ThreeEvent<MouseEvent>, item: Item) => void
}

const projected = new Vector3()

function PhotoPlane({ url }: { url: string }) {
  const texture = useTexture(url)
  texture.colorSpace = SRGBColorSpace
  const image = texture.image as { width: number; height: number } | undefined
  const aspect = image ? image.width / image.height : 1
  const repeat: [number, number] = aspect > 1 ? [1 / aspect, 1] : [1, aspect]
  texture.repeat.set(...repeat)
  texture.offset.set((1 - repeat[0]) / 2, (1 - repeat[1]) / 2)
  return (
    <mesh position={[0, 0.17, 0.0045]}>
      <planeGeometry args={[0.2, 0.2]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

function PhotoPlaceholder() {
  return (
    <mesh position={[0, 0.17, 0.0045]}>
      <planeGeometry args={[0.2, 0.2]} />
      <meshStandardMaterial color="#e9d9cf" roughness={0.8} />
    </mesh>
  )
}

export const Flower = memo(function Flower({ item, index, seed, rich, selected, still, handlers, pointerLean }: { item: Item; index: number; seed: number; rich: boolean; selected: boolean; still: boolean; handlers: FlowerHandlers; pointerLean: boolean }) {
  const [shown, setShown] = useState(() => quantize(item.stage))
  const stage = useRef(item.stage)
  const inner = useRef<Group>(null)
  const wings = useRef<Record<string, Mesh | null>>({})
  const lean = useRef({ x: 0, z: 0 })
  const colorsKey = item.c.join(',')
  const parts = useMemo(() => [...flowerParts(item, shown, seed)], [item.t, item.id, colorsKey, seed, shown])
  const photoUrl = useMedia((s) => (item.photo ? s.urls[item.photo] : undefined)) ?? mediaUrl(item.photo)

  useFrame((state, delta) => {
    const group = inner.current
    if (!group) return
    const reveal = bloomAt(index)
    const target = item.stage * reveal.stage
    const revealing = reveal.stage < 1
    stage.current = revealing || still ? target : stage.current + (target - stage.current) * Math.min(1, delta * 5)
    const q = quantize(stage.current)
    if (q !== shown) setShown(q)
    const pokedAt = useEditor.getState().pokes[item.id] ?? -1e9
    const since = (performance.now() - pokedAt) / 1000
    const bounce = since < 1.6 ? 0.14 * Math.exp(-4 * since) * Math.sin(since * 18) : 0
    group.scale.setScalar(reveal.scale * (1 + bounce))
    if (pointerLean && !still) {
      projected.set(...item.p).project(state.camera)
      const dx = state.pointer.x - projected.x
      const dy = state.pointer.y - projected.y
      const d = Math.hypot(dx, dy)
      const pull = d < 0.35 ? (0.35 - d) * 0.5 : 0
      lean.current.z += (-dx * pull - lean.current.z) * Math.min(1, delta * 4)
      lean.current.x += (dy * pull - lean.current.x) * Math.min(1, delta * 4)
      group.rotation.set(lean.current.x, 0, lean.current.z)
    }
    if (item.t === 'butterfly') {
      const flap = still ? 0.6 : 0.35 + Math.sin(state.clock.elapsedTime * 9 + index) * 0.65
      if (wings.current.wingR) wings.current.wingR.rotation.y = flap
      if (wings.current.wingL) wings.current.wingL.rotation.y = -flap
    }
  })

  const scale = item.s * SPECIES[item.t].scale
  return (
    <group position={item.p} rotation={item.r} scale={scale}>
      <group ref={inner}>
        {parts.map(([kind, geometry]) => (
          <mesh
            key={kind}
            ref={(m) => {
              wings.current[kind] = m
            }}
            geometry={geometry}
            material={partMaterial(kind, item.finish, rich)}
            castShadow
            userData={{ itemId: item.id }}
            onPointerDown={handlers.onPointerDown && ((e) => handlers.onPointerDown!(e, item))}
            onDoubleClick={handlers.onDoubleClick && ((e) => handlers.onDoubleClick!(e, item))}
            onClick={handlers.onClick && ((e) => handlers.onClick!(e, item))}
          >
            {selected && kind === parts[0][0] && <Outlines thickness={0.012} color={item.locked ? '#8c7a74' : '#d94f73'} />}
          </mesh>
        ))}
        {item.t === 'polaroid' && (photoUrl ? <PhotoPlane url={photoUrl} /> : <PhotoPlaceholder />)}
      </group>
    </group>
  )
})
