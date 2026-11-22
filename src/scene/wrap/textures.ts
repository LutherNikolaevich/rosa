import { CanvasTexture, Color, NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three'
import { hashString, mulberry32 } from '@/src/state/random'
import { type Bouquet } from '@/src/state/schema'
import { FONT_FAMILY } from '../fonts'

const cache = new Map<string, CanvasTexture>()

export function canvasTexture(key: string, size: [number, number], draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, repeat = true) {
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = size[0]
  canvas.height = size[1]
  const ctx = canvas.getContext('2d')!
  draw(ctx, size[0], size[1])
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  if (repeat) texture.wrapS = texture.wrapT = RepeatWrapping
  cache.set(key, texture)
  if (cache.size > 60) {
    const oldest = cache.keys().next().value!
    cache.get(oldest)?.dispose()
    cache.delete(oldest)
  }
  return texture
}

const tone = (hex: string, amount: number) => {
  const c = new Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return `#${new Color().setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amount))).getHexString()}`
}

const contrast = (a: string, b: string) => {
  const la = new Color(a).getHSL({ h: 0, s: 0, l: 0 }).l
  const lb = new Color(b).getHSL({ h: 0, s: 0, l: 0 }).l
  return Math.abs(la - lb)
}

const tiled = (w: number, h: number, x: number, y: number, draw: (x: number, y: number) => void) => {
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) draw(x + dx, y + dy)
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, strength: number) {
  const image = ctx.getImageData(0, 0, w, h)
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (rnd() - 0.5) * strength
    image.data[i] += n
    image.data[i + 1] += n
    image.data[i + 2] += n
  }
  ctx.putImageData(image, 0, 0)
}

function mottle(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number) {
  for (let i = 0; i < 14; i++) {
    const r = 40 + rnd() * 90
    const dark = rnd() < 0.5
    tiled(w, h, rnd() * w, rnd() * h, (x, y) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, dark ? 'rgba(70,45,20,0.07)' : 'rgba(255,245,225,0.08)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    })
  }
}

function fibres(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, count: number) {
  ctx.lineWidth = 1
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI
    const len = 3 + rnd() * 10
    ctx.strokeStyle = `rgba(${rnd() < 0.5 ? '60,40,20' : '255,240,220'},${0.04 + rnd() * 0.08})`
    tiled(w, h, rnd() * w, rnd() * h, (x, y) => {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
      ctx.stroke()
    })
  }
}

function weave(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, color: string) {
  const cell = 16
  ctx.fillStyle = tone(color, -0.22)
  ctx.fillRect(0, 0, w, h)
  const warp = Array.from({ length: w / cell }, () => (rnd() - 0.5) * 0.08)
  const weft = Array.from({ length: h / cell }, () => (rnd() - 0.5) * 0.08)
  for (let j = 0; j < h / cell; j++)
    for (let i = 0; i < w / cell; i++) {
      const over = (i + j) % 2 === 0
      const x = i * cell
      const y = j * cell
      const g = over ? ctx.createLinearGradient(x, 0, x + cell, 0) : ctx.createLinearGradient(0, y, 0, y + cell)
      const base = tone(color, over ? warp[i] : weft[j])
      g.addColorStop(0, tone(base, -0.1))
      g.addColorStop(0.5, tone(base, 0.06))
      g.addColorStop(1, tone(base, -0.1))
      ctx.fillStyle = g
      if (over) ctx.fillRect(x + 2, y, cell - 4, cell)
      else ctx.fillRect(x, y + 2, cell, cell - 4)
    }
}

function newsprint(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number) {
  ctx.fillStyle = '#f1ede4'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#2b2b2b'
  ctx.font = 'bold 40px serif'
  ctx.fillText('THE DAILY BLOOM', 20, 52)
  ctx.fillRect(18, 64, w - 36, 2)
  ctx.fillStyle = '#5a5a5a'
  for (let col = 0; col < 3; col++)
    for (let row = 0; row < 40; row++) {
      const width = row % 9 === 8 ? 60 + rnd() * 50 : 140 - rnd() * 12
      ctx.fillRect(18 + col * 165, 80 + row * 10.5, width, 3.5)
    }
}

function flower(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, ink: string, center: string, leaf: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = leaf
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(side * size * 1.35, size * 0.9, size * 0.7, size * 0.28, side * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = ink
  for (let k = 0; k < 5; k++) {
    ctx.save()
    ctx.rotate((k / 5) * Math.PI * 2)
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.62, size * 0.42, size * 0.62, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = center
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function paperTexture(wrap: Bouquet['wrap'], color: string, accent: string, fontsReady = 0) {
  const key = `paper|${wrap.t}|${wrap.pattern}|${color}|${accent}|${wrap.text}|${wrap.font}|${fontsReady}`
  const rnd = mulberry32(hashString(`${wrap.t}|${wrap.pattern}|${color}|${accent}`))
  return canvasTexture(key, [512, 512], (ctx, w, h) => {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
    if (wrap.t === 'burlap') weave(ctx, w, h, rnd, color)
    if (wrap.t === 'kraft') {
      mottle(ctx, w, h, rnd)
      fibres(ctx, w, h, rnd, 900)
    }
    if (wrap.t === 'tissue') fibres(ctx, w, h, rnd, 260)
    if (wrap.t === 'newspaper') newsprint(ctx, w, h, rnd)
    const ink = contrast(accent, color) < 0.15 ? tone(accent, contrast(color, '#ffffff') < 0.4 ? -0.2 : 0.2) : accent
    ctx.fillStyle = ink
    ctx.strokeStyle = ink
    if (wrap.pattern === 'stripes') {
      ctx.lineCap = 'butt'
      for (const [offset, width] of [[0, 22], [24, 4]] as const) {
        ctx.lineWidth = width
        for (let x = -h + offset; x < w + h; x += 64) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x + h, h)
          ctx.stroke()
        }
      }
    }
    if (wrap.pattern === 'dots')
      for (let y = 0; y < h; y += 64)
        for (let x = (y / 64) % 2 ? 32 : 0; x < w; x += 64)
          tiled(w, h, x, y, (px, py) => {
            ctx.beginPath()
            ctx.arc(px, py, 11, 0, Math.PI * 2)
            ctx.fill()
          })
    if (wrap.pattern === 'florals') {
      const center = tone(ink, contrast(ink, '#ffffff') < 0.3 ? -0.25 : 0.3)
      const leaf = `${tone(ink, -0.05)}88`
      for (let y = 0; y < h; y += 128)
        for (let x = (y / 128) % 2 ? 64 : 0; x < w; x += 128) {
          const jx = (rnd() - 0.5) * 24
          const jy = (rnd() - 0.5) * 24
          const size = 18 + rnd() * 8
          const angle = rnd() * Math.PI * 2
          tiled(w, h, x + 32 + jx, y + 32 + jy, (px, py) => flower(ctx, px, py, size, angle, ink, center, leaf))
          tiled(w, h, x + 96 + jx, y + 96 - jy, (px, py) => {
            ctx.beginPath()
            ctx.arc(px, py, 4, 0, Math.PI * 2)
            ctx.fill()
          })
        }
    }
    if (wrap.pattern === 'text' && wrap.text) {
      ctx.font = `44px ${FONT_FAMILY[wrap.font]}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const perRow = Math.max(1, Math.floor(w / (ctx.measureText(wrap.text).width + 56)))
      const step = w / perRow
      const rows = 6
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < perRow; col++)
          tiled(w, h, (col + (row % 2) * 0.5) * step, ((row + 0.5) * h) / rows, (x, y) => ctx.fillText(wrap.text, x, y, step - 40))
    }
    if (wrap.t !== 'newspaper') grain(ctx, w, h, rnd, wrap.t === 'silk' ? 6 : 12)
  })
}

export function boxFaceTextures(wrap: Bouquet['wrap'], fontsReady = 0, wall = false) {
  const color = wrap.colors[0]
  const accent = wrap.colors[1] ?? color
  const key = `box|${wrap.t}|${wrap.pattern}|${color}|${accent}|${wrap.text}|${wrap.font}|${fontsReady}`
  const plain = wrap.pattern === 'none' || (wrap.pattern === 'text' && !wrap.text)
  const motif = (ctx: CanvasRenderingContext2D, ink: string, center: string, leaf: string) => {
    const rnd = mulberry32(hashString(key))
    for (let y = 0; y < 1104; y += 184)
      for (let x = (y / 184) % 2 ? 92 : 0; x < 1104; x += 184) flower(ctx, x + 46, y + 46, 30, rnd() * Math.PI * 2, ink, center, leaf)
  }
  const band = (ctx: CanvasRenderingContext2D, from: number, to: number, alpha: number) => {
    const g = ctx.createLinearGradient(0, from, 0, to)
    g.addColorStop(0, `rgba(50,28,24,${alpha})`)
    g.addColorStop(1, 'rgba(50,28,24,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, Math.min(from, to), 1024, Math.abs(to - from))
  }
  const map = canvasTexture(
    `${key}|${wall}`,
    [1024, 1024],
    (ctx) => {
      ctx.fillStyle = ctx.createPattern(paperTexture(wrap, color, accent, fontsReady).image as HTMLCanvasElement, 'repeat')!
      ctx.fillRect(0, 0, 1024, 1024)
      if (plain) motif(ctx, tone(color, 0.07), tone(color, -0.05), `${tone(color, 0.03)}cc`)
      if (!wall) return
      band(ctx, 0, 60, 0.38)
      band(ctx, 0, 260, 0.08)
      band(ctx, 1024, 900, 0.22)
    },
    false,
  )
  const bump = canvasTexture(
    `${key}|bump`,
    [512, 512],
    (ctx) => {
      ctx.scale(0.5, 0.5)
      ctx.fillStyle = '#808080'
      ctx.fillRect(0, 0, 1024, 1024)
      if (plain) motif(ctx, '#a8a8a8', '#929292', '#989898')
    },
    false,
  )
  bump.colorSpace = NoColorSpace
  return { map, bump }
}

export function ribbonTexture(color: string, text: string, font: Bouquet['wrap']['font'], lace: boolean, fontsReady = 0) {
  const base = lace ? `#${new Color(color).lerp(new Color('#fffaf6'), 0.55).getHexString()}` : color
  const rnd = mulberry32(hashString(color))
  return canvasTexture(`ribbon|${color}|${text}|${font}|${lace}|${fontsReady}`, [128, 1024], (ctx, w, h) => {
    const shade = ctx.createLinearGradient(0, 0, w, 0)
    shade.addColorStop(0, tone(base, -0.16))
    shade.addColorStop(0.1, tone(base, -0.04))
    shade.addColorStop(0.32, tone(base, 0.1))
    shade.addColorStop(0.55, base)
    shade.addColorStop(0.9, tone(base, -0.05))
    shade.addColorStop(1, tone(base, -0.18))
    ctx.fillStyle = shade
    ctx.fillRect(0, 0, w, h)
    for (let x = 0; x < w; x += 2) {
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${rnd() * 0.05})`
      ctx.fillRect(x, 0, 1, h)
    }
    if (lace) {
      ctx.globalCompositeOperation = 'destination-out'
      for (let y = 0; y <= h; y += 24) {
        ctx.beginPath()
        ctx.arc(0, y, 9, 0, Math.PI * 2)
        ctx.arc(w, y + 12, 9, 0, Math.PI * 2)
        ctx.fill()
      }
      for (let y = 24; y < h; y += 48) {
        ctx.beginPath()
        ctx.ellipse(w / 2, y, 13, 16, 0, 0, Math.PI * 2)
        ctx.arc(w / 2 - 30, y + 24, 6, 0, Math.PI * 2)
        ctx.arc(w / 2 + 30, y + 24, 6, 0, Math.PI * 2)
        ctx.arc(20, y, 3, 0, Math.PI * 2)
        ctx.arc(w - 20, y + 24, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = tone(base, -0.1)
      ctx.lineWidth = 3
      for (let y = 24; y < h; y += 48) {
        ctx.beginPath()
        ctx.ellipse(w / 2, y, 16, 19, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else {
      ctx.fillStyle = tone(base, 0.14)
      ctx.fillRect(5, 0, 2, h)
      ctx.fillRect(w - 7, 0, 2, h)
      ctx.fillStyle = tone(base, -0.1)
      ctx.fillRect(8, 0, 1, h)
      ctx.fillRect(w - 9, 0, 1, h)
    }
    if (text) {
      ctx.save()
      ctx.translate(w / 2, h * 0.3)
      ctx.rotate(Math.PI / 2)
      ctx.fillStyle = lace ? '#7a5a55' : '#fffaf4'
      ctx.font = `64px ${FONT_FAMILY[font]}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 0, 0, h * 0.55)
      ctx.restore()
    }
  }, false)
}

export function cardTexture(card: Bouquet['card'], fontsReady: number) {
  const key = `card|${card.shape}|${card.font}|${card.ink}|${card.to}|${fontsReady}`
  return canvasTexture(key, [512, 512], (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#fffaf2'
    ctx.strokeStyle = '#e6d2c2'
    ctx.lineWidth = 6
    ctx.shadowColor = 'rgba(80,40,30,0.15)'
    ctx.shadowBlur = 10
    ctx.beginPath()
    if (card.shape === 'heart') {
      ctx.moveTo(w / 2, h * 0.86)
      ctx.bezierCurveTo(w * 0.05, h * 0.55, w * 0.1, h * 0.12, w / 2, h * 0.3)
      ctx.bezierCurveTo(w * 0.9, h * 0.12, w * 0.95, h * 0.55, w / 2, h * 0.86)
    } else if (card.shape === 'tag') {
      ctx.moveTo(w * 0.2, h * 0.25)
      ctx.lineTo(w * 0.92, h * 0.25)
      ctx.lineTo(w * 0.92, h * 0.75)
      ctx.lineTo(w * 0.2, h * 0.75)
      ctx.lineTo(w * 0.06, h * 0.5)
      ctx.closePath()
    } else if (card.shape === 'polaroid') ctx.rect(w * 0.14, h * 0.08, w * 0.72, h * 0.84)
    else ctx.rect(w * 0.06, h * 0.2, w * 0.88, h * 0.6)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.stroke()
    if (card.shape === 'envelope') {
      ctx.beginPath()
      ctx.moveTo(w * 0.06, h * 0.2)
      ctx.lineTo(w * 0.5, h * 0.5)
      ctx.lineTo(w * 0.94, h * 0.2)
      ctx.stroke()
    }
    if (card.shape === 'tag') {
      ctx.fillStyle = '#d9c3b0'
      ctx.beginPath()
      ctx.arc(w * 0.17, h * 0.5, 14, 0, Math.PI * 2)
      ctx.fill()
    }
    if (card.shape === 'polaroid') {
      ctx.fillStyle = '#f0dfe4'
      ctx.fillRect(w * 0.2, h * 0.14, w * 0.6, h * 0.52)
    }
    ctx.fillStyle = card.ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `72px ${FONT_FAMILY[card.font]}`
    const label = card.to ? `For ${card.to}` : 'For you'
    const y = card.shape === 'polaroid' ? h * 0.79 : card.shape === 'heart' ? h * 0.5 : card.shape === 'envelope' ? h * 0.66 : h * 0.5
    ctx.fillText(label, card.shape === 'tag' ? w * 0.56 : w / 2, y, w * 0.66)
  }, false)
}
