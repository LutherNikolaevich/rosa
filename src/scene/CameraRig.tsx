import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { Box3, Vector3 } from 'three'
import { useEditor, type CameraPreset } from '../state/store'
import { sceneApi } from './sceneApi'

export type Shot = [number, number, number, number, number, number]

export const PRESETS: Record<CameraPreset, Shot> = {
  front: [0, 0.2, 7.6, 0, -0.95, 0],
  top: [0, 6.6, 0.6, 0, -0.6, 0],
  close: [0.6, 0.3, 3.4, 0, -0.35, 0],
  orbit: [5.2, 1.4, 5.2, 0, -0.9, 0],
}

export const PORTRAIT_PULL = 1.45

export function CameraRig({ interactive = true, still }: { interactive?: boolean; still: boolean }) {
  const ref = useRef<CameraControls>(null)
  const camera = useEditor((s) => s.camera)
  const nonce = useEditor((s) => s.cameraNonce)
  const focus = useEditor((s) => s.focus)
  const size = useThree((s) => s.size)
  const portrait = size.width < size.height * 0.8

  useEffect(() => {
    const controls = ref.current
    if (!controls) return
    sceneApi.controls = controls
    controls.setBoundary(new Box3(new Vector3(-2.5, -3, -2.5), new Vector3(2.5, 2.5, 2.5)))
    return () => {
      if (sceneApi.controls === controls) sceneApi.controls = null
    }
  }, [])

  useEffect(() => {
    const controls = ref.current
    if (!controls) return
    if (focus) {
      const [x, y, z] = focus
      const dir = new Vector3(x, y + 0.6, z).normalize()
      controls.setLookAt(x + dir.x * 2.2, y + dir.y * 2.2 + 0.3, z + dir.z * 2.2, x, y, z, !still)
      return
    }
    const [px, py, pz, tx, ty, tz] = PRESETS[camera]
    const pull = portrait ? PORTRAIT_PULL : 1
    controls.setLookAt(px * pull, py, pz * pull, tx, ty, tz, !still && nonce > 0)
  }, [camera, nonce, focus, portrait, still])

  useFrame((_, delta) => {
    const controls = ref.current
    if (controls && camera === 'orbit' && !focus && !still && controls.enabled) controls.azimuthAngle += delta * 0.22
  })

  return (
    <CameraControls
      ref={ref}
      makeDefault
      enabled={interactive}
      minDistance={2}
      maxDistance={14}
      minPolarAngle={0.05}
      maxPolarAngle={1.85}
      smoothTime={0.35}
      draggingSmoothTime={0.12}
      dollyToCursor={false}
    />
  )
}
