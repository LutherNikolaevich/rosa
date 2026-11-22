import { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { PivotControls } from '@react-three/drei'
import { Euler, Matrix4, Quaternion, Ray, Raycaster, Sphere, Vector2, Vector3 } from 'three'
import type { Item } from '@/src/state/schema'
import { useEditor } from '../../state/store'
import { DOME_CENTER } from '../../state/arrange'
import { drag } from './drag'
import { sceneApi, setControlsEnabled } from '../sceneApi'

const raycaster = new Raycaster()
const ndc = new Vector2()
const hit = new Vector3()
const round = (v: number) => Math.round(v * 1000) / 1000

export function DragController() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const rayFor = (clientX: number, clientY: number): Ray => {
      const rect = gl.domElement.getBoundingClientRect()
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      return raycaster.ray
    }
    sceneApi.pickDome = (clientX, clientY) => {
      const ray = rayFor(clientX, clientY)
      return ray.intersectSphere(new Sphere(DOME_CENTER, 1.15), new Vector3())
    }
    sceneApi.project = (p) => {
      const rect = gl.domElement.getBoundingClientRect()
      const v = new Vector3(...p).project(camera)
      return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height }
    }
    const move = (e: PointerEvent) => {
      if (!drag.active) return
      if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 5) return
      const ray = rayFor(e.clientX, e.clientY)
      if (!ray.intersectSphere(new Sphere(DOME_CENTER, drag.radius), hit)) return
      const store = useEditor.getState()
      if (!drag.moved) {
        drag.moved = true
        store.beginGesture()
      }
      const rotation = new Quaternion().setFromUnitVectors(drag.startDir, hit.clone().sub(DOME_CENTER).normalize())
      store.commit((doc) => ({
        ...doc,
        items: doc.items.map((item) => {
          const start = drag.startItems.get(item.id)
          if (!start) return item
          const p = start.p.clone().sub(DOME_CENTER).applyQuaternion(rotation).add(DOME_CENTER)
          const e2 = new Euler().setFromQuaternion(rotation.clone().multiply(start.q))
          return { ...item, p: [round(p.x), round(p.y), round(p.z)], r: [e2.x, e2.y, e2.z] }
        }),
      }))
    }
    const up = () => {
      if (!drag.active) return
      drag.active = false
      setControlsEnabled(true)
      const store = useEditor.getState()
      if (drag.moved) store.endGesture()
      else store.poke(drag.anchorId)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [camera, gl])
  return null
}

const itemMatrix = (i: Item) => new Matrix4().compose(new Vector3(...i.p), new Quaternion().setFromEuler(new Euler(...i.r)), new Vector3(i.s, i.s, i.s))

export function Gizmo() {
  const items = useEditor((s) => s.doc.items)
  const selected = useEditor((s) => s.selected)
  const targets = useMemo(() => items.filter((i) => selected.includes(i.id) && !i.locked && !i.hidden), [items, selected])
  const centroid = useMemo(() => {
    const c = new Vector3()
    targets.forEach((t) => c.add(new Vector3(...t.p)))
    return targets.length ? c.divideScalar(targets.length) : c
  }, [targets])
  const [dragMatrix, setDragMatrix] = useState<Matrix4 | null>(null)
  const start = useRef<{ pivot: Matrix4; items: Map<string, Matrix4> } | null>(null)
  if (!targets.length) return null
  const matrix = dragMatrix ?? new Matrix4().makeTranslation(centroid.x, centroid.y, centroid.z)
  return (
    <PivotControls
      matrix={matrix}
      autoTransform={false}
      scale={0.5}
      lineWidth={2.5}
      depthTest={false}
      fixed={false}
      axisColors={['#d94f73', '#6d8a6a', '#5b7bd5']}
      hoveredColor="#f3a9bc"
      onDragStart={() => {
        setControlsEnabled(false)
        useEditor.getState().beginGesture()
        start.current = { pivot: matrix.clone(), items: new Map(targets.map((t) => [t.id, itemMatrix(t)])) }
      }}
      onDrag={(local) => {
        const s = start.current
        if (!s) return
        setDragMatrix(local.clone())
        const delta = local.clone().multiply(s.pivot.clone().invert())
        useEditor.getState().commit((doc) => ({
          ...doc,
          items: doc.items.map((item) => {
            const m = s.items.get(item.id)
            if (!m) return item
            const p = new Vector3()
            const q = new Quaternion()
            const sc = new Vector3()
            delta.clone().multiply(m).decompose(p, q, sc)
            const e = new Euler().setFromQuaternion(q)
            const uniform = Math.min(2.5, Math.max(0.3, (sc.x + sc.y + sc.z) / 3))
            return { ...item, p: [round(p.x), round(p.y), round(p.z)], r: [e.x, e.y, e.z], s: round(uniform) }
          }),
        }))
      }}
      onDragEnd={() => {
        start.current = null
        setDragMatrix(null)
        useEditor.getState().endGesture()
        setControlsEnabled(true)
      }}
    />
  )
}
