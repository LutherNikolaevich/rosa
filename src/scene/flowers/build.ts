import type { BufferGeometry } from 'three'
import { itemRng } from '@/src/state/random'
import { type Item } from '@/src/state/schema'
import { Builder, rgb, type PartKind } from './geo'
import { BUILDERS } from './species'

const cache = new Map<string, Map<PartKind, BufferGeometry>>()
const LIMIT = 400

export const quantize = (stage: number) => Math.round(stage * 20) / 20

export function flowerParts(item: Pick<Item, 't' | 'c' | 'id'>, stage: number, seed: number) {
  const key = `${item.t}|${quantize(stage)}|${item.c.join(',')}|${seed}|${item.id}`
  const hit = cache.get(key)
  if (hit) {
    cache.delete(key)
    cache.set(key, hit)
    return hit
  }
  const builder = new Builder()
  const c0 = rgb(item.c[0])
  const c1 = rgb(item.c[1] ?? item.c[0])
  BUILDERS[item.t](builder, { stage: quantize(stage), c0, c1, rng: itemRng(seed, item.id) })
  const parts = builder.build()
  cache.set(key, parts)
  if (cache.size > LIMIT) {
    const oldest = cache.keys().next().value!
    cache.delete(oldest)
  }
  return parts
}

const WARM_HEADROOM = 50
const SLICE_BUDGET_MS = 6

type IdleDeadline = { timeRemaining: () => number }
const hasIdleCallback = typeof requestIdleCallback === 'function'
const whenIdle = (fn: (deadline: IdleDeadline) => void): number => (hasIdleCallback ? requestIdleCallback(fn) : window.setTimeout(() => fn({ timeRemaining: () => SLICE_BUDGET_MS }), 16))
const cancelIdle = (id: number) => (hasIdleCallback ? cancelIdleCallback(id) : window.clearTimeout(id))

export function warmBloomStages(items: Pick<Item, 't' | 'c' | 'id' | 'stage'>[], seed: number) {
  const jobs = items.flatMap((item) => Array.from({ length: Math.round(quantize(item.stage) * 20) + 1 }, (_, k) => [item, k / 20] as const)).slice(0, LIMIT - WARM_HEADROOM)
  let next = 0
  let handle = 0
  const slice = (deadline: IdleDeadline) => {
    const started = performance.now()
    while (next < jobs.length && deadline.timeRemaining() > 1 && performance.now() - started < SLICE_BUDGET_MS) {
      const [item, stage] = jobs[next++]
      flowerParts(item, stage, seed)
    }
    if (next < jobs.length) handle = whenIdle(slice)
  }
  handle = whenIdle(slice)
  return () => cancelIdle(handle)
}
