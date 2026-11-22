import type { Vector3 } from 'three'
import type { CameraControls } from '@react-three/drei'

export interface CaptureOptions {
  width: number
  height: number
  transparent?: boolean
  type?: 'image/png' | 'image/jpeg'
  quality?: number
}

export const sceneApi: {
  controls: CameraControls | null
  capture?: (opts: CaptureOptions) => Promise<Blob>
  project?: (p: [number, number, number]) => { x: number; y: number }
  pickDome?: (clientX: number, clientY: number) => Vector3 | null
} = { controls: null }

export const setControlsEnabled = (enabled: boolean) => {
  if (sceneApi.controls) sceneApi.controls.enabled = enabled
}
