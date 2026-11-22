import { useEffect, useRef, useState } from 'react'
import { reveal, revealTime } from '../scene/animation/reveal'

const WINDOW = 300
const LONG_FRAME_MS = 34
const MAX_LOGGED = 60

interface LongFrame {
  at: number
  ms: number
  stage: string
}

const stageNow = () => {
  if (reveal.phase === 'waiting') return 'intro'
  if (reveal.phase === 'idle') return document.querySelector('[role=dialog]') ? 'card' : 'idle'
  const t = revealTime()
  return t === Infinity ? 'skipped' : `reveal ${t.toFixed(1)}s`
}

interface Stats {
  fps: number
  p95: number
  worst: number
  long: number
  frames: number
  dpr: string
}

const describe = (f: LongFrame) => `${Math.round(f.ms)}ms @${(f.at / 1000).toFixed(1)}s ${f.stage}`

const summarize = (s: Stats, frames: LongFrame[]) =>
  [`fps ${s.fps} · p95 ${s.p95}ms · worst ${s.worst}ms · long ${s.long}/${s.frames} · dpr ${s.dpr}`, navigator.userAgent, ...frames.map(describe)].join('\n')

export default function PerfMeter() {
  const deltas = useRef<number[]>([])
  const totals = useRef({ worst: 0, long: 0, frames: 0 })
  const since = useRef(performance.now())
  const longFrames = useRef<LongFrame[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let last = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      const delta = now - last
      last = now
      deltas.current.push(delta)
      if (deltas.current.length > WINDOW) deltas.current.shift()
      totals.current.frames++
      totals.current.worst = Math.max(totals.current.worst, delta)
      if (delta > LONG_FRAME_MS) {
        totals.current.long++
        if (longFrames.current.length < MAX_LOGGED) longFrames.current.push({ at: now - since.current, ms: delta, stage: stageNow() })
      }
      raf = requestAnimationFrame(tick)
    })
    const report = setInterval(() => {
      const recent = deltas.current
      if (!recent.length) return
      const sorted = [...recent].sort((a, b) => a - b)
      let elapsed = 0
      let count = 0
      for (let i = recent.length - 1; i >= 0 && elapsed < 1000; i--, count++) elapsed += recent[i]
      const canvas = document.querySelector('canvas')
      setStats({
        fps: Math.round((count * 1000) / Math.max(1, elapsed)),
        p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
        worst: Math.round(totals.current.worst),
        long: totals.current.long,
        frames: totals.current.frames,
        dpr: canvas ? (canvas.width / Math.max(1, canvas.clientWidth)).toFixed(2) : '–',
      })
    }, 500)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(report)
    }
  }, [])

  if (!stats) return null
  const slowest = [...longFrames.current].sort((a, b) => b.ms - a.ms).slice(0, 3)
  return (
    <div role="status" className="fixed left-2 top-2 z-50 max-w-[calc(100vw-1rem)] rounded-xl bg-ink-900/85 px-2.5 py-1.5 font-mono text-[11px] text-cream-50 tabular-nums">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          {stats.fps} fps · p95 {stats.p95} · worst {stats.worst} · long {stats.long}/{stats.frames} · dpr {stats.dpr}
        </span>
        <button type="button" className="rounded-md bg-cream-50/15 px-1.5 py-0.5" onClick={() => navigator.clipboard?.writeText(summarize(stats, longFrames.current))}>
          Copy
        </button>
        <button
          type="button"
          className="rounded-md bg-cream-50/15 px-1.5 py-0.5"
          onClick={() => {
            totals.current = { worst: 0, long: 0, frames: 0 }
            deltas.current = []
            longFrames.current = []
            since.current = performance.now()
          }}
        >
          Reset
        </button>
      </div>
      {slowest.map((f) => (
        <div key={f.at}>{describe(f)}</div>
      ))}
    </div>
  )
}
