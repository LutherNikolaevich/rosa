import { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { ACESFilmicToneMapping, PerspectiveCamera, Vector2, type Group, type Object3D } from 'three'
import { UNTIE_END, bloomSequence, revealTime } from './animation/reveal'
import type { Bouquet, Item } from '@/src/state/schema'
import { Flower, type FlowerHandlers } from './flowers/Flower'
import { Stems } from './flowers/Stems'
import { sceneUniforms } from './flowers/materials'
import { SceneEnvironment } from './Environment'
import { FallingPetals, Particles } from './Particles'
import { Wrap, isContainer } from './wrap/Wrap'
import { Ribbon } from './wrap/Ribbon'
import { Card3D } from './wrap/Card3D'
import { GiftBox } from './wrap/GiftBox'
import { CameraRig } from './CameraRig'
import { PostFX } from './PostFX'
import { DragController, Gizmo } from './interaction/Interaction'
import { beginDrag, pointerFlags } from './interaction/drag'
import { sceneApi } from './sceneApi'
import { useEditor } from '../state/store'
import { DOME_CENTER } from '../state/arrange'
import { useQualityProfile } from '../state/quality'
import { sfx } from '../audio/synth'

const SHADER_WARMUP_SCALE = 1e-4

function RevealGate({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.scale.setScalar(revealTime() > UNTIE_END ? 1 : SHADER_WARMUP_SCALE)
  })
  return <group ref={ref}>{children}</group>
}

function SceneClock({ wind, still }: { wind: number; still: boolean }) {
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  useFrame((state) => {
    sceneUniforms.uTime.value = still ? 0 : state.clock.elapsedTime
    sceneUniforms.uWind.value = still ? 0 : wind * (reduced ? 0.4 : 1)
  })
  return null
}

function SceneCapture() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    sceneApi.capture = async ({ width, height, transparent = false, type = 'image/png', quality = 0.92 }) => {
      const limit = gl.capabilities.maxTextureSize
      const scale = Math.min(1, limit / Math.max(width, height))
      const w = Math.floor(width * scale)
      const h = Math.floor(height * scale)
      const cam = camera as PerspectiveCamera
      const prev = { size: gl.getSize(new Vector2()), ratio: gl.getPixelRatio(), aspect: cam.aspect, background: scene.background, fog: scene.fog }
      const hidden: Object3D[] = []
      if (transparent) {
        scene.traverse((o) => {
          if (o.userData.backdrop && o.visible) {
            o.visible = false
            hidden.push(o)
          }
        })
        scene.background = null
        scene.fog = null
      }
      gl.setPixelRatio(1)
      gl.setSize(w, h, false)
      cam.aspect = w / h
      cam.updateProjectionMatrix()
      gl.setClearColor(0x000000, 0)
      gl.render(scene, cam)
      const url = gl.domElement.toDataURL(type, quality)
      hidden.forEach((o) => (o.visible = true))
      scene.background = prev.background
      scene.fog = prev.fog
      gl.setPixelRatio(prev.ratio)
      gl.setSize(prev.size.x, prev.size.y, false)
      cam.aspect = prev.aspect
      cam.updateProjectionMatrix()
      return (await fetch(url)).blob()
    }
    return () => {
      sceneApi.capture = undefined
    }
  }, [gl, scene, camera])
  return null
}

const bloomOrder = (items: Item[]) => {
  return new Map(bloomSequence(items).map((item, i) => [item.id, i]))
}

function editHandlers(): FlowerHandlers {
  return {
    onPointerDown: (e: ThreeEvent<PointerEvent>, item: Item) => {
      if (e.button !== 0) return
      e.stopPropagation()
      pointerFlags.flowerHit = true
      const store = useEditor.getState()
      const additive = e.shiftKey || e.ctrlKey || e.metaKey
      if (additive) return store.select(item.id, true)
      if (!store.selected.includes(item.id)) store.select(item.id)
      sfx('select')
      navigator.vibrate?.(8)
      const { selected, doc } = useEditor.getState()
      const movable = doc.items.filter((i) => selected.includes(i.id) && !i.locked)
      if (!movable.length) return store.poke(item.id)
      sceneApi.controls && (sceneApi.controls.enabled = false)
      beginDrag(item, movable, e.point, DOME_CENTER, e.nativeEvent.clientX, e.nativeEvent.clientY)
    },
    onDoubleClick: (e, item) => {
      e.stopPropagation()
      useEditor.getState().setFocus(item.p)
    },
  }
}

export interface BouquetSceneProps {
  doc: Bouquet
  mode: 'edit' | 'view'
  still?: boolean
  giftBox?: boolean
  onFlowerTap?: (item: Item) => void
  onOpenCard?: () => void
  onPointerMissed?: () => void
  children?: ReactNode
}

export function BouquetScene({ doc, mode, still = false, giftBox = false, onFlowerTap, onOpenCard, onPointerMissed, children }: BouquetSceneProps) {
  const quality = useEditor((s) => s.quality)
  const selected = useEditor((s) => s.selected)
  const focus = useEditor((s) => s.focus)
  const [profile, decline] = useQualityProfile(quality, still)
  const visible = useMemo(() => doc.items.filter((i) => !i.hidden), [doc.items])
  const order = useMemo(() => bloomOrder(visible), [visible])
  const handlers = useMemo<FlowerHandlers>(
    () =>
      mode === 'edit'
        ? editHandlers()
        : {
            onClick: (e, item) => {
              e.stopPropagation()
              useEditor.getState().poke(item.id)
              sfx('pop')
              onFlowerTap?.(item)
            },
          },
    [mode, onFlowerTap],
  )
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const dofTarget = useMemo(() => {
    if (mode !== 'edit') return null
    if (focus) return focus
    const first = doc.items.find((i) => selectedSet.has(i.id))
    return first ? first.p : null
  }, [mode, focus, doc.items, selectedSet])
  const container = isContainer(doc.wrap.t)
  const bare = doc.wrap.t === 'none'
  const wide = doc.wrap.t === 'wooden-box' || doc.wrap.t === 'basket' || doc.wrap.t === 'hat-box'

  return (
    <Canvas
      shadows={profile.shadows ? 'percentage' : false}
      dpr={profile.dpr}
      resize={{ debounce: 0 }}
      className="[&_canvas]:!h-full [&_canvas]:!w-full [&_canvas]:object-cover"
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }}
      camera={{ fov: 35, near: 0.1, far: 120, position: [0, 0.35, 6.4] }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1
      }}
      onPointerMissed={onPointerMissed}
      aria-hidden
    >
      <PerformanceMonitor onDecline={decline} flipflops={2} />
      <SceneClock wind={doc.scene.wind} still={still} />
      <SceneCapture />
      <Suspense fallback={null}>
        <SceneEnvironment env={doc.scene.env} shadows={profile.shadows} envResolution={profile.tier >= 3 ? 512 : 256} />
      </Suspense>
      <Particles kind={doc.scene.particles} factor={profile.particles} still={still} />
      <FallingPetals ambient={doc.scene.particles === 'petals'} factor={profile.particles} still={still} />
      <RevealGate>
        <Suspense fallback={null}>
          {visible.map((item) => (
            <Flower key={item.id} item={item} index={order.get(item.id) ?? 0} seed={doc.seed} rich={profile.rich} selected={mode === 'edit' && selectedSet.has(item.id)} still={still} handlers={handlers} pointerLean={mode === 'view' || !selected.length} />
          ))}
        </Suspense>
        <Stems items={visible} seed={doc.seed} sink={container ? 0.2 : bare ? 1 : 0.25} spread={wide ? 0.6 : 0} />
        <Wrap wrap={doc.wrap} seed={doc.seed} rich={profile.rich} />
        {!wide && <Ribbon ribbon={doc.ribbon} font={doc.wrap.font} container={container} bare={bare} />}
        <Card3D card={doc.card} onOpen={onOpenCard} still={still} radius={bare ? 0.16 : wide ? 1.25 : undefined} />
      </RevealGate>
      {giftBox && <GiftBox wrap={doc.wrap} ribbon={doc.ribbon} />}
      <CameraRig still={still} />
      {mode === 'edit' && <DragController />}
      {mode === 'edit' && <Gizmo />}
      {children}
      <PostFX profile={profile} focus={dofTarget} />
    </Canvas>
  )
}
