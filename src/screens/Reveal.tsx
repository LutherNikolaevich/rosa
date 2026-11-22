import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AnimatePresence, motion } from 'framer-motion'
import { SPECIES } from '@/src/state/species'
import { type Bouquet, type Item, type Reaction } from '@/src/state/schema'
import { BouquetScene } from '../scene/BouquetScene'
import { BLOOM_START, LID_END, bloomEnd, bloomSequence, bloomGap, cardTime, reveal, revealTime, startReveal } from '../scene/animation/reveal'
import { spawnPetals } from '../scene/animation/petals'
import { warmBloomStages } from '../scene/flowers/build'
import { sceneApi } from '../scene/sceneApi'
import { PORTRAIT_PULL, PRESETS, type Shot } from '../scene/CameraRig'
import { FONT_FAMILY } from '../scene/fonts'
import { useEditor } from '../state/store'
import { useMedia } from '../state/media'
import { editTokenFor, linkUrl, sendReaction } from '../state/share'
import { playMusic, sfx, stopMusic, unlockAudio } from '../audio/synth'
import { t } from '../i18n'
import { Icon } from '../ui/Icon'
import { toast } from '../ui/toast'
import { copyLink, downloadImage } from '../ui/ShareModal'
import { MuteButton } from '../ui/Toolbar'
import { prefersReducedMotion } from '../ui/useMediaQuery'
import { navigate } from './router'

export interface RevealData {
  state: Bouquet
  allowRemix: boolean
  owner: boolean
  readReceipt?: boolean
  reactions?: Reaction[]
  openedAt?: string | null
}

const EMOJIS = ['❤️', '😭', '🥰', '😂', '🌸'] as const
const REDUCED_CARD_DELAY = 1.2

const SHOTS = {
  boxClosed: [0, 0.4, 12.9, 0, -1.31, 0],
  boxOpening: [0, 0.9, 9, 0, -0.6, 0],
  wrapUnfolding: [0, -0.7, 4.6, 0, -1.0, 0],
  blooming: [3.8, 0.8, 6.2, 0, -0.8, 0],
  finale: PRESETS.front,
} satisfies Record<string, Shot>

function RevealDirector({ items, playing, box }: { items: Item[]; playing: boolean; box: boolean }) {
  const bloomed = useRef(-1)
  const shots = useRef(0)
  const framedOnce = useRef(false)
  const started = useRef(false)
  const portrait = useThree((s) => s.size.width < s.size.height * 0.8)
  const order = useMemo(() => bloomSequence(items), [items])
  const cut = (shot: Shot, smooth: boolean, pull = portrait ? PORTRAIT_PULL : 1) => sceneApi.controls?.setLookAt(shot[0] * pull, shot[1], shot[2] * pull, shot[3], shot[4], shot[5], smooth)
  const finale = (smooth: boolean) => {
    cut(SHOTS.finale, smooth)
    setTimeout(() => sceneApi.controls && (sceneApi.controls.smoothTime = 0.35), 2500)
  }
  useEffect(() => {
    const interrupted = !playing && started.current && shots.current < 3
    bloomed.current = -1
    shots.current = 0
    if (interrupted) finale(!prefersReducedMotion())
    if (playing) started.current = true
  }, [playing])
  useEffect(() => {
    if (playing || !box || !sceneApi.controls) return
    cut(SHOTS.boxClosed, framedOnce.current, 1)
    framedOnce.current = true
  }, [playing, box, portrait])
  useFrame(() => {
    if (!playing || reveal.phase !== 'playing') return
    const t = revealTime()
    const controls = sceneApi.controls
    if (t === Infinity) return
    if (controls && shots.current === 0) {
      shots.current = 1
      controls.smoothTime = 1.1
      cut(box ? SHOTS.boxOpening : SHOTS.wrapUnfolding, true)
    }
    if (controls && shots.current === 1 && t > (box ? LID_END + 0.8 : 1.2)) {
      shots.current = 2
      cut(SHOTS.blooming, true)
    }
    if (controls && shots.current === 2 && t > bloomEnd(order.length) - 0.6) {
      shots.current = 3
      finale(true)
    }
    const index = Math.floor((t - BLOOM_START) / bloomGap(order.length))
    while (bloomed.current < Math.min(index, order.length - 1)) {
      bloomed.current++
      const item = order[bloomed.current]
      if (bloomed.current % 2 === 0) sfx('chime')
      if (SPECIES[item.t].category !== 'filler') spawnPetals([{ p: item.p, color: item.c[0] }], true, 2)
    }
  })
  return null
}

const PETAL_EASE = [0.22, 1, 0.36, 1] as const
const ENVELOPE_OPEN = 1.25

function WaxSeal() {
  return (
    <svg viewBox="0 0 80 80" className="h-full w-full overflow-visible">
      <defs>
        <filter id="wax-body" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="9" xChannelSelector="R" yChannelSelector="G" result="blob" />
          <feGaussianBlur in="blob" stdDeviation="2.6" result="height" />
          <feDiffuseLighting in="height" surfaceScale="4" diffuseConstant="1.25" lightingColor="#fff" result="diffuse">
            <feDistantLight azimuth="235" elevation="50" />
          </feDiffuseLighting>
          <feSpecularLighting in="height" surfaceScale="4" specularConstant="0.8" specularExponent="26" lightingColor="#fff" result="spec">
            <feDistantLight azimuth="235" elevation="50" />
          </feSpecularLighting>
          <feComposite in="blob" in2="diffuse" operator="arithmetic" k1="1" result="lit" />
          <feComposite in="spec" in2="blob" operator="in" result="gloss" />
          <feComposite in="lit" in2="gloss" operator="arithmetic" k2="1" k3="0.65" result="wax" />
          <feComposite in="wax" in2="blob" operator="in" result="sealed" />
          <feDropShadow in="sealed" dx="0.6" dy="2" stdDeviation="1.6" floodColor="#3a1020" floodOpacity="0.45" />
        </filter>
        <filter id="wax-press" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="height" />
          <feDiffuseLighting in="height" surfaceScale="2.4" diffuseConstant="1.2" lightingColor="#fff" result="diffuse">
            <feDistantLight azimuth="55" elevation="45" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="diffuse" operator="arithmetic" k1="1" result="lit" />
          <feComposite in="lit" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <circle cx="40" cy="40" r="27" fill="var(--color-blush-600)" filter="url(#wax-body)" />
      <g filter="url(#wax-press)" fill="var(--color-blush-600)">
        <path d="M40 22a18 18 0 1 1 0 36a18 18 0 1 1 0-36zm0 2.4a15.6 15.6 0 1 0 0 31.2a15.6 15.6 0 1 0 0-31.2z" />
        <circle cx="40" cy="35" r="6.4" />
        <circle cx="34.6" cy="39" r="5" />
        <circle cx="45.4" cy="39" r="5" />
        <rect x="39" y="43" width="2" height="10" rx="1" />
      </g>
    </svg>
  )
}

type Pt = [number, number]
const curve = (a: Pt, b: Pt, c: Pt, d: Pt): Pt[] =>
  Array.from({ length: 9 }, (_, i) => {
    const t = (i + 1) / 9
    const m = 1 - t
    return [m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * d[0], m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * d[1]]
  })
const outline = (start: Pt, ...segments: [Pt, Pt, Pt][]) => {
  const points = [start]
  for (const [b, c, d] of segments) points.push(...curve(points[points.length - 1], b, c, d))
  return `polygon(${points.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(',')})`
}
const mirrorX = (s: [Pt, Pt, Pt]): [Pt, Pt, Pt] => s.map(([x, y]) => [100 - x, y]) as [Pt, Pt, Pt]
const mirrorY = (s: [Pt, Pt, Pt]): [Pt, Pt, Pt] => s.map(([x, y]) => [x, 100 - y]) as [Pt, Pt, Pt]
const SIDE_FLAP: [Pt, Pt, Pt][] = [
  [[22, 18], [39, 42], [45, 54]],
  [[47, 58], [46.5, 61], [43.5, 63]],
  [[32, 74], [14, 88], [0, 100]],
]
const BOTTOM_FLAP: [Pt, Pt, Pt][] = [
  [[16, 86], [35, 63], [46.5, 53.5]],
  [[48.5, 52], [51.5, 52], [53.5, 53.5]],
  [[65, 63], [84, 86], [100, 100]],
]
const TOP_FLAP: [Pt, Pt, Pt][] = [
  [[86, 22], [63, 70], [54, 91]],
  [[52.4, 97.5], [47.6, 97.5], [46, 91]],
  [[37, 70], [14, 22], [0, 0]],
]
const LEFT_CLIP = outline([0, 0], ...SIDE_FLAP)
const RIGHT_CLIP = outline([100, 0], ...SIDE_FLAP.map(mirrorX))
const BOTTOM_CLIP = outline([0, 100], ...BOTTOM_FLAP)
const TOP_CLIP = outline([100, 0], ...TOP_FLAP)
const LINER_CLIP = outline([100, 100], ...TOP_FLAP.map(mirrorY))

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='g' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feDiffuseLighting surfaceScale='.7' lighting-color='#fff'><feDistantLight azimuth='225' elevation='65'/></feDiffuseLighting><feColorMatrix values='0 0 0 0 .32 0 0 0 0 .22 0 0 0 0 .18 -.55 0 0 0 .52'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>",
)}")`
const MOTTLE = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='m'><feTurbulence type='fractalNoise' baseFrequency='.012' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .35 0 0 0 0 .22 0 0 0 0 .18 0 0 0 .14 0'/></filter><rect width='100%' height='100%' filter='url(#m)'/></svg>",
)}")`
const PETALS = [0, 72, 144, 216, 288]
const linerTile = (ink: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44'><g fill='${ink}' fill-opacity='.55'>${PETALS.map((a) => `<ellipse cx='11' cy='6.4' rx='2.3' ry='3.4' transform='rotate(${a} 11 11)'/>`).join('')}${PETALS.map((a) => `<ellipse cx='33' cy='30.4' rx='1.5' ry='2.2' transform='rotate(${a + 36} 33 33)'/>`).join('')}</g><circle cx='11' cy='11' r='1.6' fill='#fffaf3'/><circle cx='33' cy='33' r='1' fill='#fffaf3'/></svg>`,
  )}")`
const paper = (...layers: string[]) => ({ background: [GRAIN, MOTTLE, ...layers].join(',') })

function Envelope({ card, label, animated, tint, ribbon }: { card: Bouquet['card']; label: string; animated: boolean; tint: string; ribbon: string }) {
  const ink = { fontFamily: FONT_FAMILY[card.font], color: card.ink }
  const after = (delay: number, duration: number) => ({ delay: animated ? delay : 0, duration: animated ? duration : 0, ease: PETAL_EASE })
  const tones = {
    '--paper': `color-mix(in oklab, ${tint} 22%, var(--color-cream-50))`,
    '--paper-shade': `color-mix(in oklab, ${tint} 26%, var(--color-cream-200))`,
    '--paper-light': `color-mix(in oklab, ${tint} 10%, var(--color-cream-50))`,
    '--liner': `color-mix(in oklab, ${ribbon} 14%, var(--color-cream-50))`,
  } as CSSProperties
  const liner = paper(linerTile(ribbon), 'var(--liner)')
  return (
    <motion.div
      aria-hidden
      className="absolute inset-0 grid place-items-center bg-cream-100/80 backdrop-blur-sm"
      exit={{ opacity: 0, transition: animated ? after(ENVELOPE_OPEN - 0.35, 0.45) : { duration: 0.15 } }}
    >
      <motion.div
        className="relative aspect-[10/7] w-[min(22rem,84vw)] -translate-y-[6dvh]"
        style={tones}
        initial={animated ? { y: 28, rotate: -5, opacity: 0 } : false}
        animate={{ y: 0, rotate: -1.2, opacity: 1 }}
        exit={{ y: -12, rotate: 0, scale: 1.04, transition: after(0.4, 0.8) }}
        transition={{ duration: 0.7, ease: PETAL_EASE }}
      >
        <div className="absolute inset-0 rounded-[3px] shadow-[0_30px_40px_-22px_rgba(70,35,30,0.5),0_6px_14px_-6px_rgba(70,35,30,0.25),0_1px_2px_rgba(70,35,30,0.2)]" style={liner} />
        <motion.div
          className="absolute inset-x-[5%] top-[5%] z-[2] h-[88%] overflow-hidden rounded-sm px-[8%] pt-[7%] shadow-[0_1px_3px_rgba(80,40,40,0.2)]"
          style={paper('repeating-linear-gradient(0deg, rgba(120,90,70,0.05) 0 1px, transparent 1px 5px)', 'var(--color-cream-50)')}
          exit={{ y: '-52%', transition: after(0.55, 0.7) }}
        >
          <p className="line-clamp-3 text-xl leading-snug" style={ink}>
            {card.body}
          </p>
        </motion.div>
        <div className="absolute inset-0 z-[3] overflow-hidden rounded-[3px]">
          <div className="absolute inset-0 drop-shadow-[1px_0_1.5px_rgba(70,35,30,0.18)]">
            <div className="absolute inset-0" style={{ clipPath: LEFT_CLIP, ...paper('linear-gradient(100deg, var(--paper-shade), var(--paper) 75%)') }} />
          </div>
          <div className="absolute inset-0 drop-shadow-[-1px_0_1.5px_rgba(70,35,30,0.18)]">
            <div className="absolute inset-0" style={{ clipPath: RIGHT_CLIP, ...paper('linear-gradient(260deg, var(--paper-shade), var(--paper) 75%)') }} />
          </div>
          <div className="absolute inset-0 drop-shadow-[0_-1.5px_2px_rgba(70,35,30,0.2)]">
            <div className="absolute inset-0" style={{ clipPath: BOTTOM_CLIP, ...paper('linear-gradient(to bottom, var(--paper), var(--paper-light))') }} />
          </div>
          <p className="absolute inset-x-0 bottom-[9%] truncate px-6 text-center text-[2rem] leading-tight" style={ink}>
            {label}
          </p>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_22%_12%,rgba(255,255,255,0.22),transparent_55%),linear-gradient(160deg,transparent_55%,rgba(70,35,30,0.07))]" />
        </div>
        <motion.div
          className="absolute inset-x-0 top-0 z-[4] h-[60%] origin-top [transform-style:preserve-3d]"
          style={{ transformPerspective: 900 }}
          exit={{ rotateX: 180, transition: after(0.12, 0.42), transitionEnd: { zIndex: 1 } }}
        >
          <div className="absolute inset-0 drop-shadow-[0_2px_2px_rgba(70,35,30,0.22)] [backface-visibility:hidden]">
            <div className="h-full" style={{ clipPath: TOP_CLIP, ...paper('radial-gradient(90% 120% at 25% 0%, rgba(255,255,255,0.25), transparent 60%)', 'linear-gradient(to bottom, var(--paper-shade), var(--paper) 60%, var(--paper-light))') }} />
          </div>
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateX(180deg)]" style={{ clipPath: LINER_CLIP, ...liner }} />
        </motion.div>
        <motion.div className="absolute left-1/2 top-[57%] z-[5] h-16 w-16 -translate-x-1/2 -translate-y-1/2" exit={{ scale: 1.25, opacity: 0, transition: after(0, 0.22) }}>
          <WaxSeal />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const OVERLAY = 'fixed inset-0 z-40 h-full max-h-none w-full max-w-none text-ink-900 backdrop:bg-transparent'

function useModal() {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    return () => {
      dialog.close()
      opener?.focus()
    }
  }, [])
  return ref
}

function CardView({ card, sigUrl, onClose }: { card: Bouquet['card']; sigUrl?: string; onClose: () => void }) {
  const ref = useModal()
  const shape = card.shape === 'heart' ? 'rounded-[48%_48%_40%_40%/42%_42%_58%_58%]' : card.shape === 'polaroid' ? 'rounded-sm pb-14' : card.shape === 'envelope' ? 'rounded-xl border-t-[10px] border-blush-300' : 'rounded-2xl'
  return (
    <motion.dialog ref={ref} aria-label={t('viewer.readCard')} className={`${OVERLAY} grid place-items-center bg-ink-900/25 p-4 backdrop-blur-[2px]`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} onCancel={(e) => (e.preventDefault(), onClose())}>
      <motion.article
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 80, rotate: -8, opacity: 0 }}
        animate={{ y: 0, rotate: [-8, 4, -2, 1, 0], opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: prefersReducedMotion() ? 0.3 : 1.1, ease: [0.22, 1, 0.36, 1] }}
        className={`relative max-h-[80dvh] w-full max-w-md overflow-y-auto bg-cream-50 p-8 shadow-2xl ${shape}`}
        style={{ fontFamily: FONT_FAMILY[card.font], color: card.ink, fontSize: `${card.size * 1.35}rem` }}
      >
        <button type="button" onClick={onClose} className="btn-icon absolute right-3 top-3 font-sans text-base" aria-label={t('share.close')}>
          <Icon name="close" />
        </button>
        {card.to && <p className="mb-3">{t('viewer.forName', { name: card.to })},</p>}
        <p className="whitespace-pre-wrap leading-snug">{card.body}</p>
        {card.from && <p className="mt-5 text-right">{t('viewer.from', { name: card.from })}</p>}
        {sigUrl && <img src={sigUrl} alt={t('card.signature')} className="ml-auto mt-2 h-16 object-contain" />}
      </motion.article>
    </motion.dialog>
  )
}

function Photos({ urls, onClose }: { urls: string[]; onClose: () => void }) {
  const ref = useModal()
  return (
    <motion.dialog ref={ref} aria-label={t('viewer.photos')} className={`${OVERLAY} flex flex-wrap items-center justify-center gap-6 overflow-y-auto bg-ink-900/40 p-6 backdrop-blur-sm`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} onCancel={(e) => (e.preventDefault(), onClose())}>
      <button type="button" onClick={onClose} className="btn-icon glass fixed right-4 top-4 z-10" aria-label={t('share.close')}>
        <Icon name="close" />
      </button>
      {urls.map((url, i) => (
        <motion.figure key={url} initial={{ y: 60, rotate: 0, opacity: 0 }} animate={{ y: 0, rotate: [-4, 3, -2][i], opacity: 1 }} transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="w-64 bg-white p-3 pb-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <img src={url} alt="" className="aspect-square w-full object-cover" />
        </motion.figure>
      ))}
    </motion.dialog>
  )
}

function Reactions({ id, onClose }: { id: string; onClose: () => void }) {
  const [emoji, setEmoji] = useState<string>(EMOJIS[0])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  return (
    <motion.form
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="glass pointer-events-auto w-full max-w-sm space-y-3 rounded-3xl p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setSending(true)
        const ok = await sendReaction(id, emoji, reply)
        setSending(false)
        if (ok) {
          toast(t('viewer.reactionSent'))
          onClose()
        } else toast(t('viewer.error'))
      }}
    >
      <div role="radiogroup" aria-label={t('viewer.react')} className="flex justify-between">
        {EMOJIS.map((e) => (
          <button key={e} type="button" role="radio" aria-checked={emoji === e} onClick={() => setEmoji(e)} className="grid h-12 w-12 place-items-center rounded-full text-2xl transition-transform hover:scale-110 aria-checked:scale-110 aria-checked:bg-blush-100">
            {e}
          </button>
        ))}
      </div>
      <input className="input" maxLength={280} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t('viewer.replyPlaceholder')} aria-label={t('viewer.replyPlaceholder')} />
      <button type="submit" className="btn-primary w-full" disabled={sending}>
        {t('viewer.sendReaction')}
      </button>
    </motion.form>
  )
}

function OwnerPanel({ id, data }: { id: string; data: RevealData }) {
  return (
    <div className="glass pointer-events-auto w-full max-w-sm space-y-3 rounded-3xl p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg">{t('viewer.ownerBanner')}</h2>
        <button type="button" className="btn border border-cream-300" onClick={() => copyLink(linkUrl(id))}>
          <Icon name="copy" size={15} /> {t('share.copy')}
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-ink-500">
        <Icon name="bell" size={15} /> {data.openedAt ? t('viewer.openedAt', { date: new Date(data.openedAt).toLocaleString() }) : t('viewer.notOpened')}
      </p>
      <div>
        <h3 className="field-label mb-1">{t('viewer.reactions')}</h3>
        {data.reactions?.length ? (
          <ul className="max-h-40 space-y-1.5 overflow-y-auto">
            {data.reactions.map((r, i) => (
              <li key={i} className="flex gap-2 rounded-xl bg-white/70 px-3 py-2">
                <span className="text-lg">{r.emoji}</span>
                <span className="flex-1 text-ink-700">{r.reply}</span>
                <time className="text-xs text-ink-500">{new Date(r.at).toLocaleDateString()}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-500">{t('viewer.noReactions')}</p>
        )}
      </div>
      <button type="button" className="btn-primary w-full" onClick={() => (useEditor.getState().load(data.state, { id, editToken: editTokenFor(id) ?? '' }), navigate('/'))}>
        <Icon name="edit" size={15} /> {t('viewer.edit')}
      </button>
    </div>
  )
}

export function Reveal({ data, id, preview, embed, still }: { data: RevealData; id: string | null; preview: boolean; embed: boolean; still: boolean }) {
  const doc = data.state
  const visible = useMemo(() => doc.items.filter((i) => !i.hidden), [doc.items])
  const reduced = still || prefersReducedMotion()
  const skipIntro = data.owner || still
  const [phase, setPhase] = useState<'intro' | 'opening' | 'done'>(skipIntro ? 'done' : 'intro')
  const [cardOpen, setCardOpen] = useState(false)
  const [photosOpen, setPhotosOpen] = useState(false)
  const [reactOpen, setReactOpen] = useState(false)
  const [info, setInfo] = useState<Item | null>(null)
  const [captions, setCaptions] = useState(false)
  const [saving, setSaving] = useState(false)
  const urls = useMedia((s) => s.urls)
  const voice = useRef<HTMLAudioElement | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => {
    reveal.phase = skipIntro ? 'idle' : 'waiting'
    return () => {
      reveal.phase = 'idle'
      stopMusic()
      voice.current?.pause()
      timers.current.forEach(clearTimeout)
    }
  }, [skipIntro])

  useEffect(() => {
    if (phase !== 'intro' || reduced) return
    return warmBloomStages(bloomSequence(visible), doc.seed)
  }, [phase, reduced, visible, doc.seed])

  useEffect(() => {
    if (!info) return
    const id = setTimeout(() => setInfo(null), 4000)
    return () => clearTimeout(id)
  }, [info])

  const voiceUrl = doc.media.voice ? urls[doc.media.voice] : undefined
  const photoUrls = doc.media.photos.map((r) => urls[r]).filter(Boolean)

  const open = () => {
    if (phase !== 'intro') return
    unlockAudio()
    if (voiceUrl) {
      voice.current = new Audio(voiceUrl)
      voice.current.play().then(() => voice.current?.pause()).catch(() => {})
    }
    if (doc.scene.music !== 'none') playMusic(doc.scene.music, doc.scene.volume)
    sfx('tie')
    startReveal(visible.length, reduced)
    setPhase('opening')
    const at = (seconds: number, fn: () => void, reducedSeconds = 0) => timers.current.push(window.setTimeout(fn, (reduced ? reducedSeconds : seconds) * 1000))
    at(1.0, () => sfx('crinkle'))
    at(
      cardTime(visible.length),
      () => {
        setCardOpen(true)
        if (voice.current) {
          voice.current.currentTime = 0
          voice.current.play().catch(() => {})
        }
      },
      REDUCED_CARD_DELAY,
    )
    at(bloomEnd(visible.length) + 0.4, () => setPhase('done'))
  }

  const skip = () => {
    reveal.reduced = true
    timers.current.forEach(clearTimeout)
    setPhase('done')
    setCardOpen(true)
  }

  const replay = () => {
    timers.current.forEach(clearTimeout)
    voice.current?.pause()
    stopMusic()
    setCardOpen(false)
    reveal.phase = 'waiting'
    setPhase('intro')
  }

  const name = doc.card.to
  const envelope = doc.reveal.intro === 'envelope'
  const lightScene = doc.scene.env === 'golden-hour'
  return (
    <main className="relative h-full overflow-hidden bg-cream-100">
      <h1 className="sr-only">{name ? t('viewer.forName', { name }) : t('viewer.forYou')}</h1>
      <div className="absolute inset-0">
        <BouquetScene doc={doc} mode="view" still={still} giftBox={doc.reveal.intro === 'box' && phase !== 'done'} onFlowerTap={setInfo} onOpenCard={() => setCardOpen(true)}>
          <RevealDirector items={visible} playing={phase === 'opening'} box={doc.reveal.intro === 'box' && phase !== 'done'} />
        </BouquetScene>
      </div>

      <AnimatePresence>
        {phase === 'intro' && (
          <motion.button
            type="button"
            key="intro"
            onClick={open}
            className="absolute inset-0 z-20 flex flex-col items-center justify-end gap-3 pb-[14dvh] text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { delay: envelope && !reduced ? ENVELOPE_OPEN : 0, duration: reduced ? 0.15 : 0.25, ease: PETAL_EASE } }}
            aria-label={`${name ? t('viewer.forName', { name }) : t('viewer.forYou')}. ${t('viewer.tapToOpen')}`}
          >
            {envelope && <Envelope card={doc.card} label={name ? t('viewer.forName', { name }) : t('viewer.forYou')} animated={!reduced} tint={doc.wrap.colors[0]} ribbon={doc.ribbon.c} />}
            <div className="relative space-y-2">
              {!envelope && <p className={`font-display text-4xl sm:text-5xl ${lightScene ? 'text-ink-900 drop-shadow-[0_1px_8px_rgba(255,255,255,0.8)]' : 'text-cream-50 drop-shadow-[0_1px_8px_rgba(43,33,33,0.85)]'}`}>{name ? t('viewer.forName', { name }) : t('viewer.forYou')}</p>}
              <motion.p animate={reduced ? {} : { opacity: [1, 0.55, 1] }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ repeat: 2, duration: 2.2, delay: 1 }} className="glass inline-block rounded-full px-5 py-2 text-sm font-semibold text-ink-700">
                {t('viewer.tapToOpen')}
              </motion.p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {phase !== 'intro' && (
        <motion.div className="glass absolute right-4 top-4 z-30 flex items-center gap-1 rounded-full p-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
          {phase === 'opening' && (
            <button type="button" onClick={skip} className="btn">
              {t('viewer.skip')}
            </button>
          )}
          <MuteButton />
        </motion.div>
      )}

      <AnimatePresence>
        {info && (
          <motion.div key={info.id} role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass absolute left-1/2 top-20 z-20 w-max max-w-[90vw] -translate-x-1/2 rounded-2xl px-4 py-2.5 text-center">
            <p className="font-display text-lg">{SPECIES[info.t].name}</p>
            <p className="text-sm text-ink-500">{SPECIES[info.t].meaning}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'done' && !embed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {data.owner && id && <OwnerPanel id={id} data={data} />}
          <AnimatePresence>{reactOpen && id && <Reactions id={id} onClose={() => setReactOpen(false)} />}</AnimatePresence>
          {data.readReceipt && !data.owner && <p className="glass rounded-full px-3 py-1 text-xs text-ink-500">{t('viewer.readReceiptNotice')}</p>}
          {captions && doc.media.transcript && <p className="glass max-w-md rounded-2xl px-4 py-2 text-sm text-ink-700">{doc.media.transcript}</p>}
          <nav aria-label={t('viewer.actions')} className="glass pointer-events-auto flex max-w-full flex-wrap justify-center gap-1 rounded-[1.75rem] p-1.5 max-[400px]:[&_.btn]:px-3 max-[400px]:[&_.btn-primary]:px-3 max-[400px]:[&_.btn:not(.btn-icon)>svg]:hidden max-[359px]:gap-0.5 max-[359px]:[&_.btn]:px-2">
            <button type="button" className="btn" onClick={() => setCardOpen(true)}>
              <Icon name="card" size={16} /> {t('viewer.readCard')}
            </button>
            {photoUrls.length > 0 && (
              <button type="button" className="btn" onClick={() => setPhotosOpen(true)}>
                <Icon name="image" size={16} /> {t('viewer.photos')}
              </button>
            )}
            {voiceUrl && (
              <button type="button" className="btn" onClick={() => (voice.current ??= new Audio(voiceUrl)).play()}>
                <Icon name="play" size={16} /> {t('viewer.voice')}
              </button>
            )}
            {voiceUrl && doc.media.transcript && (
              <button type="button" className="btn" aria-pressed={captions} onClick={() => setCaptions((c) => !c)}>
                CC
              </button>
            )}
            {id && !preview && !data.owner && (
              <button type="button" className="btn" aria-expanded={reactOpen} onClick={() => setReactOpen((v) => !v)}>
                <Icon name="heart" size={16} /> {t('viewer.react')}
              </button>
            )}
            <button
              type="button"
              className="btn"
              disabled={saving}
              onClick={() => {
                setSaving(true)
                downloadImage('2K', false, false)
                  .catch(() => toast(t('viewer.keepFailed')))
                  .finally(() => setSaving(false))
              }}
            >
              <Icon name="download" size={16} /> {saving ? t('viewer.saving') : t('viewer.keep')}
            </button>
            <button type="button" className="btn-icon" aria-label={t('viewer.replay')} onClick={replay}>
              <Icon name="refresh" size={16} />
            </button>
            {preview && (
              <button type="button" className="btn-primary" onClick={() => navigate('/')}>
                {t('viewer.backToEditor')}
              </button>
            )}
          </nav>
          {!data.owner && !preview && (
            <p className="glass pointer-events-auto rounded-full px-3 py-1 text-xs text-ink-500">
              {t('viewer.madeWith')} ·{' '}
              <a href="/" className="font-semibold text-blush-700 underline-offset-2 hover:underline">
                {t('viewer.makeYourOwn')}
              </a>
            </p>
          )}
        </div>
      )}

      {embed && phase === 'done' && (
        <a href={id ? `/b/${id}` : '/'} target="_blank" rel="noopener" className="glass absolute bottom-3 right-3 z-20 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-700">
          {t('app.name')}
        </a>
      )}

      <AnimatePresence>
        {cardOpen && <CardView key="card" card={doc.card} sigUrl={doc.card.sig ? urls[doc.card.sig] : undefined} onClose={() => setCardOpen(false)} />}
        {photosOpen && <Photos key="photos" urls={photoUrls} onClose={() => setPhotosOpen(false)} />}
      </AnimatePresence>
    </main>
  )
}
