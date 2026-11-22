import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
window.addEventListener('popstate', notify)
window.addEventListener('hashchange', notify)

export function navigate(path: string, replace = false) {
  history[replace ? 'replaceState' : 'pushState'](null, '', path)
  notify()
}

export function useLocation() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => location.pathname + location.search + location.hash,
  )
}
