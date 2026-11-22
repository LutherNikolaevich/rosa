import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Lightformer } from '@react-three/drei'
import { BackSide, Color, CubeCamera, HalfFloatType, Scene, ShaderMaterial, Vector3, WebGLCubeRenderTarget } from 'three'
import type { Env } from '@/src/state/schema'
import { sceneUniforms } from './flowers/materials'
import { SceneSet } from './Sets'

interface Preset {
  sky: [string, string]
  fog: string
  hemi: [string, string, number]
  sun: { color: string; intensity: number; dir: [number, number, number] }
  fill: { color: string; intensity: number }
  formers: { color: string; intensity: number; position: [number, number, number]; scale: [number, number, number] }[]
  glow?: { dir: [number, number, number]; color: string }
  shadow: number
  translucency: number
  envIntensity: number
}

export const PRESETS: Record<Env, Preset> = {
  'golden-hour': {
    sky: ['#b9a6c9', '#f6c27a'],
    fog: '#f2c48a',
    glow: { dir: [-0.35, 0.06, -0.94], color: '#fff0c4' },
    hemi: ['#ffe6c8', '#6a5466', 0.25],
    sun: { color: '#ffa95c', intensity: 3.6, dir: [-4, 2, 3] },
    fill: { color: '#9fb0ff', intensity: 0.5 },
    formers: [
      { color: '#ffb36b', intensity: 6, position: [-4, 1.5, -6], scale: [6, 3, 1] },
      { color: '#ffd9a8', intensity: 1.2, position: [4, 3, 4], scale: [4, 4, 1] },
      { color: '#b9b8ff', intensity: 0.6, position: [0, 6, 0], scale: [6, 6, 1] },
    ],
    shadow: 0.35,
    translucency: 0.6,
    envIntensity: 0.6,
  },
  cafe: {
    sky: ['#7a5a48', '#2e211b'],
    fog: '#43312a',
    hemi: ['#ffd9b0', '#3b2a20', 0.6],
    sun: { color: '#ffc98a', intensity: 2.4, dir: [2, 5, 4] },
    fill: { color: '#ffb27f', intensity: 0.7 },
    formers: [
      { color: '#ffcf96', intensity: 4, position: [0, 6, 0], scale: [3, 3, 1] },
      { color: '#ffb37a', intensity: 1, position: [-5, 1, -3], scale: [2, 5, 1] },
      { color: '#ffe2c2', intensity: 1.5, position: [0, 1, 6], scale: [5, 3, 1] },
    ],
    shadow: 0.6,
    translucency: 0.35,
    envIntensity: 1,
  },
  night: {
    sky: ['#14304a', '#060b14'],
    fog: '#0c1a28',
    hemi: ['#9aa4cf', '#1a1620', 0.35],
    sun: { color: '#c3ccff', intensity: 1.3, dir: [-3, 5, 2] },
    fill: { color: '#ffb35c', intensity: 1.4 },
    formers: [
      { color: '#ffc27a', intensity: 2.5, position: [3, 1, 4], scale: [2, 2, 1] },
      { color: '#6f7fd6', intensity: 1, position: [-4, 4, -2], scale: [4, 4, 1] },
    ],
    shadow: 0.5,
    translucency: 0.45,
    envIntensity: 1,
  },
  starry: {
    sky: ['#0c1030', '#4b2a6b'],
    fog: '#1c1640',
    hemi: ['#c2c0ee', '#1a1230', 0.4],
    sun: { color: '#e6e9ff', intensity: 1.8, dir: [2, 5, 3] },
    fill: { color: '#ff9ec7', intensity: 0.5 },
    formers: [
      { color: '#b9b5ff', intensity: 2, position: [0, 5, -4], scale: [6, 3, 1] },
      { color: '#ff9ec7', intensity: 0.8, position: [4, 0, 4], scale: [3, 3, 1] },
    ],
    shadow: 0.4,
    translucency: 0.5,
    envIntensity: 1,
  },
}

function Backdrop({ top, bottom, glow }: { top: string; bottom: string; glow?: Preset['glow'] }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new Color(top) },
          bottom: { value: new Color(bottom) },
          glowDir: { value: new Vector3(...(glow?.dir ?? [0, 1, 0])).normalize() },
          glowColor: { value: new Color(glow?.color ?? '#000000') },
        },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 bottom; uniform vec3 glowDir; uniform vec3 glowColor; varying vec3 vP; void main(){ float k = smoothstep(-0.35, 0.65, vP.y); float g = max(dot(normalize(vP), glowDir), 0.0); vec3 c = mix(bottom, top, k) + glowColor * (pow(g, 10.0) * 0.55 + smoothstep(0.9993, 0.9996, g) * 1.6); gl_FragColor = vec4(c, 1.0); \n#include <colorspace_fragment>\n }',
      }),
    [top, bottom, glow],
  )
  return <mesh material={material} scale={60} userData={{ backdrop: true }} renderOrder={-1}><sphereGeometry args={[1, 32, 16]} /></mesh>
}

function LightformerEnvironment({ resolution, intensity, children }: { resolution: number; intensity: number; children: ReactNode }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useRef<CubeCamera>(null)
  const [virtualScene] = useState(() => new Scene())
  const target = useMemo(() => {
    const cube = new WebGLCubeRenderTarget(resolution)
    cube.texture.type = HalfFloatType
    return cube
  }, [resolution])
  useEffect(() => () => target.dispose(), [target])
  useLayoutEffect(() => {
    const autoClear = gl.autoClear
    gl.autoClear = true
    camera.current?.update(gl, virtualScene)
    gl.autoClear = autoClear
    const previous = { environment: scene.environment, intensity: scene.environmentIntensity }
    scene.environment = target.texture
    scene.environmentIntensity = intensity
    return () => {
      scene.environment = previous.environment
      scene.environmentIntensity = previous.intensity
    }
  }, [gl, scene, virtualScene, target, intensity])
  return createPortal(
    <>
      {children}
      <cubeCamera ref={camera} args={[0.1, 1000, target]} />
    </>,
    virtualScene,
  )
}

const sunWorld = new Vector3()

export function SceneEnvironment({ env, shadows, envResolution }: { env: Env; shadows: boolean; envResolution: number }) {
  const preset = PRESETS[env]
  const sunPosition = useMemo(() => new Vector3(...preset.sun.dir).normalize().multiplyScalar(8), [preset])
  useFrame(({ camera }) => {
    sunWorld.copy(sunPosition).normalize().negate()
    sceneUniforms.uSunView.value.copy(sunWorld).transformDirection(camera.matrixWorldInverse)
    sceneUniforms.uTranslucency.value = preset.translucency
  })
  return (
    <>
      <Backdrop top={preset.sky[0]} bottom={preset.sky[1]} glow={preset.glow} />
      <fog attach="fog" args={[preset.fog, 14, 40]} />
      <hemisphereLight args={[preset.hemi[0], preset.hemi[1], preset.hemi[2]]} />
      <directionalLight position={sunPosition} color={preset.sun.color} intensity={preset.sun.intensity} castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-radius={6} />
      <pointLight position={[2.5, 0.5, 3]} color={preset.fill.color} intensity={preset.fill.intensity * 6} distance={12} />
      <LightformerEnvironment key={env} resolution={envResolution} intensity={preset.envIntensity}>
        <color attach="background" args={[preset.sky[1]]} />
        {preset.formers.map((f, i) => (
          <Lightformer key={i} form="rect" color={f.color} intensity={f.intensity} position={f.position} scale={f.scale} target={[0, 0, 0]} />
        ))}
      </LightformerEnvironment>
      <SceneSet env={env} />
      <group userData={{ backdrop: true }}>
        <ContactShadows position={[0, -2.62, 0]} opacity={preset.shadow} scale={7} blur={2.6} far={3} resolution={512} color="#2b1a14" />
      </group>
    </>
  )
}
