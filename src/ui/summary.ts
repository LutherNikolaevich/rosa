import { Color } from 'three'
import { SPECIES } from '@/src/state/species'
import { type Item } from '@/src/state/schema'
import { t } from '../i18n'

export function colorName(hex: string): string {
  const hsl = { h: 0, s: 0, l: 0 }
  new Color(hex).getHSL(hsl)
  const h = hsl.h * 360
  if (hsl.l > 0.9) return 'white'
  if (hsl.l < 0.15) return 'black'
  if (hsl.s < 0.15) return hsl.l > 0.7 ? 'cream' : 'gray'
  if (h < 15 || h >= 345) return hsl.l > 0.7 ? 'pink' : 'red'
  if (h < 40) return hsl.l < 0.4 ? 'brown' : 'orange'
  if (h < 70) return 'yellow'
  if (h < 170) return 'green'
  if (h < 250) return 'blue'
  if (h < 290) return 'purple'
  return hsl.l > 0.55 ? 'pink' : 'magenta'
}

export const describeItem = (i: Item) => `${SPECIES[i.t].category === 'filler' ? '' : `${colorName(i.c[0])} `}${SPECIES[i.t].name.toLowerCase()}`

export function summarize(items: Item[]): string {
  const visible = items.filter((i) => !i.hidden)
  if (!visible.length) return t('summary.empty')
  const counts = new Map<string, number>()
  visible.forEach((i) => counts.set(describeItem(i), (counts.get(describeItem(i)) ?? 0) + 1))
  const parts = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => `${n} ${name}`)
  return t('summary.items', { count: visible.length, parts: parts.join(', ') })
}
