import { useEffect, useState } from 'react'
import { getGPUTier } from 'detect-gpu'
import type { Quality } from './store'

export interface QualityProfile {
  tier: 0 | 1 | 2 | 3
  dpr: [number, number]
  bloom: boolean
  ao: boolean
  dof: boolean
  shadows: boolean
  rich: boolean
  particles: number
}

const PROFILES: QualityProfile[] = [
  { tier: 0, dpr: [1, 1], bloom: false, ao: false, dof: false, shadows: false, rich: false, particles: 0.35 },
  { tier: 1, dpr: [1, 1.5], bloom: true, ao: false, dof: false, shadows: false, rich: true, particles: 0.6 },
  { tier: 2, dpr: [1, 1.75], bloom: true, ao: true, dof: true, shadows: true, rich: true, particles: 1 },
  { tier: 3, dpr: [1, 2], bloom: true, ao: true, dof: true, shadows: true, rich: true, particles: 1.4 },
]

const NAMED: Record<Exclude<Quality, 'auto'>, number> = { low: 0, medium: 1, high: 2, ultra: 3 }

const TIER_KEY = 'rosa:gpu-tier'
const TIER_TTL_MS = 86_400_000

const storedTier = () => {
  try {
    const { tier, at } = JSON.parse(localStorage.getItem(TIER_KEY) ?? 'null') ?? {}
    const fresh = typeof at === 'number' && Date.now() - at < TIER_TTL_MS
    return fresh && Number.isInteger(tier) && tier >= 0 && tier <= 3 ? tier : null
  } catch {
    return null
  }
}

const rememberTier = (tier: number) => {
  try {
    localStorage.setItem(TIER_KEY, JSON.stringify({ tier, at: Date.now() }))
  } catch {}
  return tier
}

let detected: Promise<number> | null = null
const detectTier = () =>
  (detected ??= Promise.resolve(storedTier()).then(
    (cached) =>
      cached ??
      getGPUTier({ benchmarksURL: 'https://unpkg.com/detect-gpu@5.0.70/dist/benchmarks' })
        .then((r) => rememberTier(r.isMobile ? Math.min(1, r.tier - 1) : r.tier >= 3 ? 2 : Math.max(0, r.tier - 1)))
        .catch(() => 1),
  ))

export function useQualityProfile(quality: Quality, still: boolean): [QualityProfile, () => void] {
  const [autoTier, setAutoTier] = useState(1)
  useEffect(() => {
    if (quality === 'auto') detectTier().then(setAutoTier)
  }, [quality])
  const tier = still ? 0 : quality === 'auto' ? autoTier : NAMED[quality]
  const decline = () => setAutoTier((t) => Math.max(0, t - 1))
  return [PROFILES[Math.max(0, Math.min(3, tier))], decline]
}
