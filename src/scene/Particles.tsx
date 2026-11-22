import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import { BoxGeometry, Color, DoubleSide, Euler, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import type { Bouquet } from '@/src/state/schema'
import { mulberry32 } from '@/src/state/random'
import { petal } from './flowers/geo'
import { petalQueue } from './animation/petals'

const GROUND = -2.6
const dummy = new Object3D()

function Rain({ count, still }: { count: number; still: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  const drops = useMemo(() => Array.from({ length: count }, (_, i) => {
    const rng = mulberry32(i + 1)
    return { x: (rng() - 0.5) * 9, y: rng() * 8 - 3, z: rng() * 6 - 2, speed: 6 + rng() * 3 }
  }), [count])
  const geometry = useMemo(() => new BoxGeometry(0.007, 0.36, 0.007), [])
  const material = useMemo(() => new MeshBasicMaterial({ color: '#f2f7ff', transparent: true, opacity: 0.55, depthWrite: false, fog: false }), [])
  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    drops.forEach((d, i) => {
      if (!still) d.y -= d.speed * Math.min(dt, 0.05)
      if (d.y < -3.5) d.y = 4.5
      dummy.position.set(d.x, d.y, d.z)
      dummy.rotation.set(0, 0, 0.12)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} userData={{ backdrop: true }} />
}

interface Petal {
  pos: Vector3
  vel: Vector3
  rot: Euler
  spin: Vector3
  age: number
  life: number
  scale: number
  settled: boolean
  alive: boolean
}

export function FallingPetals({ ambient, factor, still }: { ambient: boolean; factor: number; still: boolean }) {
  const max = 220
  const ref = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => {
    const g = petal({ len: 0.07, width: 0.06, cup: 0.6, curl: 0.4, tip: 0.3, base: 0.35, nu: 4, nv: 4 }, mulberry32(7))
    g.translate(0, -0.035, 0)
    return g
  }, [])
  const material = useMemo(() => new MeshStandardMaterial({ side: DoubleSide, roughness: 0.6 }), [])
  const petals = useMemo<Petal[]>(() => Array.from({ length: max }, () => ({ pos: new Vector3(), vel: new Vector3(), rot: new Euler(), spin: new Vector3(), age: 0, life: 0, scale: 1, settled: false, alive: false })), [])
  const cursor = useRef(0)
  const ambientClock = useRef(0)
  const rng = useMemo(() => mulberry32(99), [])
  const color = useMemo(() => new Color(), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < max; i++) {
      mesh.setColorAt(i, color.set('#ffffff'))
      mesh.setMatrixAt(i, dummy.matrix.makeScale(0, 0, 0))
    }
  }, [color])

  const spawn = (x: number, y: number, z: number, hex: string, burst: boolean) => {
    const i = cursor.current++ % max
    const p = petals[i]
    p.alive = true
    p.settled = false
    p.age = 0
    p.life = 7 + rng() * 4
    p.scale = 0.7 + rng() * 0.6
    p.pos.set(x + (rng() - 0.5) * 0.15, y, z + (rng() - 0.5) * 0.15)
    p.vel.set((rng() - 0.5) * 0.8, burst ? 1.2 + rng() * 1.2 : -0.2, (rng() - 0.5) * 0.8)
    p.rot.set(rng() * 6, rng() * 6, rng() * 6)
    p.spin.set((rng() - 0.5) * 6, (rng() - 0.5) * 6, (rng() - 0.5) * 6)
    ref.current?.setColorAt(i, color.set(hex))
    if (ref.current?.instanceColor) ref.current.instanceColor.needsUpdate = true
  }

  useFrame((state, delta) => {
    const mesh = ref.current
    if (!mesh) return
    const dt = still ? 0 : Math.min(delta, 0.05)
    while (petalQueue.length) {
      const s = petalQueue.shift()!
      spawn(s.x, s.y, s.z, s.color, s.burst)
    }
    if (ambient && !still) {
      ambientClock.current += dt
      const every = 0.35 / Math.max(0.2, factor)
      while (ambientClock.current > every) {
        ambientClock.current -= every
        spawn((rng() - 0.5) * 7, 3.5, (rng() - 0.5) * 5, ['#f7c6d4', '#ffe1ea', '#f39bb3', '#fff4f0'][Math.floor(rng() * 4)], false)
      }
    }
    const t = state.clock.elapsedTime
    petals.forEach((p, i) => {
      if (!p.alive) {
        dummy.scale.setScalar(0)
      } else {
        p.age += dt
        if (!p.settled) {
          p.vel.y -= 2.2 * dt
          p.vel.multiplyScalar(1 - 1.6 * dt)
          p.vel.x += Math.sin(t * 2 + i) * 0.9 * dt
          p.vel.z += Math.cos(t * 1.7 + i * 0.7) * 0.9 * dt
          p.pos.addScaledVector(p.vel, dt)
          p.rot.x += p.spin.x * dt
          p.rot.y += p.spin.y * dt
          p.rot.z += p.spin.z * dt
          if (p.pos.y <= GROUND + 0.01) {
            p.pos.y = GROUND + 0.01
            p.settled = true
            p.rot.set(-Math.PI / 2 + (rng() - 0.5) * 0.3, p.rot.y, 0)
          }
        }
        const fade = Math.min(1, (p.life - p.age) / 1.2)
        if (fade <= 0) p.alive = false
        dummy.position.copy(p.pos)
        dummy.rotation.copy(p.rot)
        dummy.scale.setScalar(Math.max(0, fade) * p.scale)
      }
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geometry, material, max]} frustumCulled={false} castShadow userData={{ backdrop: true }} />
}

export function Particles({ kind, factor, still }: { kind: Bouquet['scene']['particles']; factor: number; still: boolean }) {
  const speed = still ? 0 : 1
  return (
    <group userData={{ backdrop: true }}>
      {kind === 'pollen' && <Sparkles count={Math.round(70 * factor)} scale={[7, 5, 6]} position={[0, 0, 0]} size={2.2} speed={0.25 * speed} color="#fff0b8" opacity={0.8} />}
      {kind === 'fireflies' && <Sparkles count={Math.round(45 * factor)} scale={[7, 5, 6]} size={7} speed={0.35 * speed} color="#ffcf6b" opacity={1} noise={1.5} />}
      {kind === 'stars' && <Stars radius={30} depth={25} count={Math.round(2500 * factor)} factor={3.5} saturation={0.3} fade speed={0.6 * speed} />}
      {kind === 'rain' && <Rain count={Math.round(280 * factor)} still={still} />}
    </group>
  )
}

