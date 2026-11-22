import { memo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type { Group } from 'three'
import { DoubleSide } from 'three'
import type { Bouquet } from '@/src/state/schema'
import { cardTexture } from './textures'
import { useFontReady } from '../fonts'
import { TIE_Y } from './Ribbon'
import { wrapRadiusAt } from './Wrap'

export const Card3D = memo(function Card3D({ card, onOpen, still, radius = wrapRadiusAt(TIE_Y) + 0.08 }: { card: Bouquet['card']; onOpen?: () => void; still: boolean; radius?: number }) {
  const fontsReady = useFontReady(card.font)
  const group = useRef<Group>(null)
  useFrame((state) => {
    if (group.current && !still) group.current.rotation.z = 0.12 + Math.sin(state.clock.elapsedTime * 1.3) * 0.05
  })
  const texture = cardTexture(card, fontsReady)
  const anchor: [number, number, number] = [radius * 0.55, TIE_Y - 0.02, radius * 0.85]
  return (
    <group position={anchor}>
      <mesh position={[0.08, -0.1, 0.02]} rotation={[0, 0, -0.9]}>
        <cylinderGeometry args={[0.003, 0.003, 0.24, 4]} />
        <meshStandardMaterial color="#b89a6a" />
      </mesh>
      <group ref={group} position={[0.2, -0.3, 0.05]} rotation={[-0.1, 0.35, 0.12]}>
        <mesh
          onClick={onOpen && ((e: ThreeEvent<MouseEvent>) => (e.stopPropagation(), onOpen()))}
          onPointerOver={onOpen && (() => (document.body.style.cursor = 'pointer'))}
          onPointerOut={() => (document.body.style.cursor = '')}
          castShadow
        >
          <planeGeometry args={[0.42 * card.size, 0.42 * card.size]} />
          <meshStandardMaterial map={texture} transparent alphaTest={0.4} roughness={0.85} side={DoubleSide} />
        </mesh>
      </group>
    </group>
  )
})
