import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, type InstancedMesh, LatheGeometry, Object3D, Vector2 } from 'three'
import type { Env } from '@/src/state/schema'
import { mulberry32 } from '@/src/state/random'
import { canvasTexture } from './wrap/textures'

const FLOOR = -2.63
const backdrop = { backdrop: true }
const lathe = (points: [number, number][], segments = 40) => new LatheGeometry(points.map(([x, y]) => new Vector2(x, y)), segments)

const woodTexture = () =>
  canvasTexture('set-wood', [512, 512], (ctx, w, h) => {
    const rng = mulberry32(3)
    const plank = w / 6
    for (let p = 0; p < 6; p++) {
      const x = p * plank
      ctx.fillStyle = `hsl(24, 40%, ${22 + rng() * 8}%)`
      ctx.fillRect(x, 0, plank, h)
      for (let i = 0; i < 40; i++) {
        const gx = x + rng() * plank
        ctx.strokeStyle = `rgba(30, 15, 8, ${0.08 + rng() * 0.14})`
        ctx.lineWidth = 0.5 + rng() * 1.5
        ctx.beginPath()
        ctx.moveTo(gx, 0)
        ctx.bezierCurveTo(gx + (rng() - 0.5) * 14, h * 0.33, gx + (rng() - 0.5) * 14, h * 0.66, gx + (rng() - 0.5) * 8, h)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(15, 8, 4, 0.55)'
      ctx.fillRect(x, 0, 2, h)
    }
  }, false)

const GRASS = 5000
const FRINGE = 4000
const MEADOW_INNER = 5.5
const MEADOW_FRINGE = 3.5

function Meadow() {
  const ref = useRef<InstancedMesh>(null)
  const blade = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute([-0.012, 0, 0, 0.012, 0, 0, 0, 1, 0], 3))
    g.computeVertexNormals()
    return g
  }, [])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rng = mulberry32(5)
    const o = new Object3D()
    const color = new Color()
    const dry = new Color('#d8b863')
    for (let i = 0; i < GRASS + FRINGE; i++) {
      const fringe = i >= GRASS ? rng() ** 1.6 : 0
      const r = fringe ? MEADOW_INNER + fringe * MEADOW_FRINGE : Math.sqrt(1.3 ** 2 + rng() * (MEADOW_INNER ** 2 - 1.3 ** 2))
      const a = rng() * Math.PI * 2
      o.position.set(Math.cos(a) * r, FLOOR, Math.sin(a) * r)
      o.rotation.set((rng() - 0.5) * 0.5, rng() * Math.PI, (rng() - 0.5) * 0.5)
      o.scale.set(1, (0.1 + rng() * 0.22) * (1 - fringe), 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, color.set('#8f8a3c').lerp(dry, rng()))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [])
  return (
    <group userData={backdrop}>
      <mesh position={[0, FLOOR, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#b39a57" roughness={1} />
      </mesh>
      <instancedMesh ref={ref} args={[blade, undefined, GRASS + FRINGE]} frustumCulled={false}>
        <meshStandardMaterial side={DoubleSide} roughness={0.9} />
      </instancedMesh>
    </group>
  )
}

const LAMPS = Array.from({ length: 7 }, (_, i) => {
  const rng = mulberry32(40 + i)
  const a = Math.PI * (1.05 + (i / 6) * 0.9)
  const r = 6 + rng() * 3
  return [Math.cos(a) * r, 0.8 + rng() * 2, Math.sin(a) * r] as [number, number, number]
})

function CafeTable() {
  const wood = woodTexture()
  const cup = useMemo(() => lathe([[0, 0.005], [0.13, 0.005], [0.16, 0.03], [0.19, 0.2], [0.2, 0.26], [0.185, 0.26], [0.175, 0.2], [0.15, 0.05], [0, 0.05]]), [])
  const saucer = useMemo(() => lathe([[0, 0], [0.3, 0], [0.34, 0.035], [0.32, 0.04], [0.18, 0.015], [0, 0.015]]), [])
  return (
    <group userData={backdrop}>
      <mesh position={[0, FLOOR - 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[3.6, 3.6, 0.1, 96]} />
        <meshStandardMaterial map={wood} roughness={0.45} />
      </mesh>
      <mesh position={[0, FLOOR - 3.1, 0]}>
        <cylinderGeometry args={[0.18, 0.28, 6, 24]} />
        <meshStandardMaterial color="#231710" roughness={0.5} metalness={0.5} />
      </mesh>
      <group position={[-1.4, FLOOR, 0.8]} rotation={[0, -0.6, 0]}>
        <mesh geometry={saucer} castShadow receiveShadow>
          <meshStandardMaterial color="#f4efe6" roughness={0.3} side={DoubleSide} />
        </mesh>
        <group position={[0, 0.015, 0]}>
          <mesh geometry={cup} castShadow>
            <meshStandardMaterial color="#f4efe6" roughness={0.3} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.215, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.178, 32]} />
            <meshStandardMaterial color="#3a1f12" roughness={0.2} />
          </mesh>
          <mesh position={[0.2, 0.15, 0]} castShadow>
            <torusGeometry args={[0.06, 0.016, 10, 24]} />
            <meshStandardMaterial color="#f4efe6" roughness={0.3} />
          </mesh>
        </group>
      </group>
      {LAMPS.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh>
            <sphereGeometry args={[0.22, 20, 12]} />
            <meshBasicMaterial color={[2, 1.15, 0.45]} toneMapped={false} fog={false} />
          </mesh>
          <mesh position={[0, 5, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 10, 6]} />
            <meshBasicMaterial color="#1a120d" fog={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const SETS: Partial<Record<Env, () => React.JSX.Element>> = {
  'golden-hour': Meadow,
  cafe: CafeTable,
}

export function SceneSet({ env }: { env: Env }) {
  const Set = SETS[env]
  return Set ? <Set /> : null
}
