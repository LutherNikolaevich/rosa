import { Component, Suspense, lazy, useMemo, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { decodeHash } from '@/src/state/hash'
import { useLocation } from './router'
import { Editor } from './Editor'
import { Viewer, type ViewerSource } from './Viewer'
import { Wilted, NoWebGL, hasWebGL } from './Wilted'
import { Toasts } from '../ui/toast'
import { useEditor } from '../state/store'
import { setMuted, unlockAudio } from '../audio/synth'

const PerfMeter = lazy(() => import('../ui/PerfMeter'))
const showPerf = new URLSearchParams(location.search).has('perf')

setMuted(useEditor.getState().muted)
addEventListener('pointerdown', unlockAudio, { once: true, capture: true })

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error(error)
  }
  render() {
    return this.state.failed ? <NoWebGL /> : this.props.children
  }
}

function route(path: string): { page: 'editor' } | { page: 'viewer'; source: ViewerSource } | { page: 'wilted' } {
  const url = new URL(path, location.origin)
  const hash = url.hash.startsWith('#b=') ? url.hash.slice(3) : null
  if (url.pathname === '/' && hash) {
    const state = decodeHash(hash)
    return state ? { page: 'viewer', source: { kind: 'hash', state } } : { page: 'wilted' }
  }
  if (url.pathname === '/') return { page: 'editor' }
  if (url.pathname === '/preview') return { page: 'viewer', source: { kind: 'preview' } }
  const match = url.pathname.match(/^\/b\/([A-Za-z0-9]{6,8})\/?$/)
  if (match) return { page: 'viewer', source: { kind: 'remote', id: match[1] } }
  return { page: 'wilted' }
}

export function App() {
  const path = useLocation()
  const current = useMemo(() => route(path), [path])
  const content = !hasWebGL && current.page !== 'wilted' ? (
    <NoWebGL image={current.page === 'viewer' && current.source.kind === 'remote' ? `/b/${current.source.id}/opengraph-image` : undefined} />
  ) : current.page === 'editor' ? (
    <Editor />
  ) : current.page === 'viewer' ? (
    <Viewer key={path} source={current.source} />
  ) : (
    <Wilted />
  )
  return (
    <MotionConfig reducedMotion="user">
      <SceneBoundary>{content}</SceneBoundary>
      <Toasts />
      {showPerf && (
        <Suspense fallback={null}>
          <PerfMeter />
        </Suspense>
      )}
    </MotionConfig>
  )
}
