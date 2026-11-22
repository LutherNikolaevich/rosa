export type RevealPhase = 'idle' | 'waiting' | 'playing'

type Placed = { p: [number, number, number] }

export const bloomSequence = <T extends Placed>(items: T[]) => [...items].sort((a, b) => Math.hypot(a.p[0], a.p[2]) - Math.hypot(b.p[0], b.p[2]) || b.p[1] - a.p[1])

export const reveal = {
  phase: 'idle' as RevealPhase,
  start: 0,
  count: 1,
  reduced: false,
}

export const UNTIE_END = 0.7
export const LID_END = 1.4
export const UNFOLD_START = 1.0
export const UNFOLD_END = 2.2
export const BLOOM_START = 1.7
export const BLOOM_DURATION = 0.9

export const bloomGap = (count: number) => Math.min(0.2, 3.2 / Math.max(1, count))
export const bloomEnd = (count: number) => BLOOM_START + bloomGap(count) * count + BLOOM_DURATION
export const cardTime = (count: number) => bloomEnd(count) + 0.3

export function revealTime() {
  if (reveal.phase === 'idle') return Infinity
  if (reveal.phase === 'waiting') return 0
  return reveal.reduced ? Infinity : (performance.now() - reveal.start) / 1000
}

export const progress = (t: number, from: number, to: number) => Math.min(1, Math.max(0, (t - from) / (to - from)))

const easeOutBack = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2)

export function bloomAt(index: number): { stage: number; scale: number } {
  const t = revealTime()
  if (t === Infinity) return { stage: 1, scale: 1 }
  const local = progress(t, BLOOM_START + index * bloomGap(reveal.count), BLOOM_START + index * bloomGap(reveal.count) + BLOOM_DURATION)
  return { stage: local, scale: local <= 0 ? 0.001 : Math.max(0.001, easeOutBack(Math.min(1, local * 1.6))) }
}

export function startReveal(count: number, reduced: boolean) {
  reveal.count = count
  reveal.reduced = reduced
  reveal.start = performance.now()
  reveal.phase = 'playing'
}
