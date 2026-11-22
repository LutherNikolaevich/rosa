import { create } from 'zustand'
import { AnimatePresence, motion } from 'framer-motion'

interface Toast {
  id: number
  text: string
}

const useToasts = create<{ items: Toast[] }>(() => ({ items: [] }))
let next = 1

export function toast(text: string) {
  const id = next++
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, text }] }))
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), 3200)
}

export function Toasts() {
  const items = useToasts((s) => s.items)
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-cream-50 shadow-lg">
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
