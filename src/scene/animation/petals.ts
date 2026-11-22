import type { Vector3 } from 'three'

export interface PetalSpawn {
  x: number
  y: number
  z: number
  color: string
  burst: boolean
}

export const petalQueue: PetalSpawn[] = []

export const spawnPetals = (points: { p: Vector3 | [number, number, number]; color: string }[], burst = false, perPoint = 3) => {
  for (const { p, color } of points) {
    const [x, y, z] = Array.isArray(p) ? p : [p.x, p.y, p.z]
    for (let i = 0; i < perPoint; i++) petalQueue.push({ x, y, z, color, burst })
  }
}
