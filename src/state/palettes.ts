import { Color } from 'three'
import { SPECIES } from '@/src/state/species'
import { type Item } from '@/src/state/schema'

export const PALETTES: Record<string, string[]> = {
  cloud: ['#f0eee9', '#e6ddd0', '#d9cbb8', '#f7f3ec', '#cfc6bb'],
  bordeaux: ['#6e1f2f', '#8c3a45', '#b98a7a', '#d8c2ae', '#4a1a22'],
  butter: ['#f6e19a', '#fff3c9', '#eac36a', '#f4ead2', '#e8b04f'],
  lilac: ['#b9a2d0', '#d8c8e6', '#9c7fae', '#efe6f2', '#c7a0b8'],
  terracotta: ['#c8643f', '#e39a6f', '#a5492f', '#f2c7a5', '#8f5a3c'],
  gem: ['#7a1f5c', '#1f4e79', '#00666c', '#9e2c6a', '#4b2a6b'],
  powdered: ['#f4c9c3', '#f6dcc6', '#d9d3ec', '#cfe3dc', '#fbe7d6'],
  fuchsia: ['#9e2c6a', '#f27d52', '#e5487a', '#ff8a3d', '#ffb27a'],
  aquarii: ['#f5c842', '#2f6fc4', '#fbf8f0', '#ffe07a', '#6fa3e0'],
  dino: ['#4f9a3a', '#7d4fb0', '#8fcf5f', '#a985d6', '#2f6b2a'],
  dunkin: ['#d6322f', '#2a52b8', '#f6c933', '#ff6b5a', '#5b82d9'],
  mari: ['#d63271', '#a82ab8', '#f633a1', '#ff5a7b', '#c65bd9'],
}

const colorable = (item: Item) => SPECIES[item.t].category !== 'filler' && item.t !== 'polaroid' && item.t !== 'fairy-lights'

const lighten = (hex: string, amount: number) => {
  const c = new Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return `#${new Color().setHSL(hsl.h, hsl.s, Math.min(0.97, hsl.l + amount)).getHexString()}`
}

export function applyPalette(items: Item[], palette: string[]): Map<string, Item['c']> {
  const result = new Map<string, Item['c']>()
  items.filter(colorable).forEach((item, i) => {
    const base = palette[i % palette.length]
    result.set(item.id, [base, lighten(base, 0.12)])
  })
  return result
}

export function harmonize(items: Item[]): Map<string, Item['c']> {
  const targets = items.filter(colorable)
  if (!targets.length) return new Map()
  let x = 0
  let y = 0
  const hsl = { h: 0, s: 0, l: 0 }
  targets.forEach((i) => {
    new Color(i.c[0]).getHSL(hsl)
    x += Math.cos(hsl.h * Math.PI * 2)
    y += Math.sin(hsl.h * Math.PI * 2)
  })
  const base = (Math.atan2(y, x) / (Math.PI * 2) + 1) % 1
  const result = new Map<string, Item['c']>()
  targets.forEach((item, i) => {
    new Color(item.c[0]).getHSL(hsl)
    const offset = [0, 0.06, -0.06, 0.1, -0.03][i % 5]
    const hue = (base + offset + 1) % 1
    const c0 = `#${new Color().setHSL(hue, Math.min(0.85, Math.max(0.35, hsl.s)), Math.min(0.85, Math.max(0.4, hsl.l))).getHexString()}`
    result.set(item.id, [c0, lighten(c0, 0.12)])
  })
  return result
}

export function pickColor(image: HTMLImageElement | HTMLCanvasElement, x: number, y: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, x, y, 1, 1, 0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
