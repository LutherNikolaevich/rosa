import { useEffect } from 'react'
import { useEditor } from '../state/store'

const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export function useKeyboard(openShortcuts: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || typing(e.target) || document.querySelector('dialog[open]')) return
      const s = useEditor.getState()
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      const step = e.shiftKey ? 0.2 : 0.05
      const handled = (() => {
        if (mod && key === 'z') return e.shiftKey ? s.redo() : s.undo(), true
        if (mod && key === 'y') return s.redo(), true
        if (mod && key === 'c') return s.copy(), true
        if (mod && key === 'v') return s.paste(), true
        if (mod && key === 'a') return s.selectMany(s.doc.items.map((i) => i.id)), true
        if (mod) return false
        if (key === 'delete' || key === 'backspace') return s.removeSelected(), true
        if (key === 'd') return s.duplicateSelected(), true
        if (key === 'g') return e.shiftKey ? s.ungroup() : s.group(), true
        if (key === 'm') return s.mirrorSelected(), true
        if (key === 'l') return s.toggle('locked'), true
        if (key === 'h') return s.toggle('hidden'), true
        if (key === 'escape') return s.select(null), s.setFocus(null), true
        if (e.key === '?') return openShortcuts(), true
        if (key === 'arrowleft') return s.nudge(-step, 0, 0), true
        if (key === 'arrowright') return s.nudge(step, 0, 0), true
        if (key === 'arrowup') return s.nudge(0, step, 0), true
        if (key === 'arrowdown') return s.nudge(0, -step, 0), true
        return false
      })()
      if (handled) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openShortcuts])
}
