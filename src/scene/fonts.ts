import { useEffect, useState } from 'react'
import type { FontId } from '@/src/state/schema'
import { manrope } from '@/src/fonts'

export const FONT_FAMILY: Record<FontId, string> = {
  'handwriting-1': "'Caveat', cursive",
  'handwriting-2': "'Dancing Script', cursive",
  'handwriting-3': "'Homemade Apple', cursive",
  serif: "'Cormorant Garamond', serif",
  display: "'Playfair Display', serif",
  sans: manrope.style.fontFamily,
  rounded: "'Quicksand', sans-serif",
  typewriter: "'Special Elite', monospace",
}

const CARD_FONTS =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Dancing+Script:wght@500&family=Homemade+Apple&family=Playfair+Display:ital@0;1&family=Quicksand:wght@500&family=Special+Elite&display=swap'

const cardSheet =
  typeof document === 'undefined'
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: CARD_FONTS })
        link.onload = link.onerror = () => resolve()
        document.head.append(link)
      })

export const loadFont = (font: FontId) => cardSheet.then(() => document.fonts.load(`48px ${FONT_FAMILY[font]}`)).catch(() => [])

export function useFontReady(font: FontId) {
  const [ready, setReady] = useState(0)
  useEffect(() => {
    let alive = true
    loadFont(font).then(() => alive && setReady((n) => n + 1))
    return () => {
      alive = false
    }
  }, [font])
  return ready
}
