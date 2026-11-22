import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const mql = matchMedia(query)
      mql.addEventListener('change', notify)
      return () => mql.removeEventListener('change', notify)
    },
    () => matchMedia(query).matches,
  )
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
