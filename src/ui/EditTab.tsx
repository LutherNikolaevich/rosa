import { Fragment, useRef, useState } from 'react'
import { FINISHES, type Item } from '@/src/state/schema'
import { SPECIES } from '@/src/state/species'
import { useEditor } from '../state/store'
import { PALETTES, applyPalette, harmonize, pickColor } from '../state/palettes'
import { resizeImage, useMedia } from '../state/media'
import { t } from '../i18n'
import { ColorField, Field, Segmented, Slider, Toggle } from './fields'
import { Icon, type IconName } from './Icon'
import { SpeciesGlyph } from './SpeciesGlyph'
import { toast } from './toast'

const deg = (r: number) => `${Math.round((r * 180) / Math.PI)}°`
const PALETTE_KEYS = ['cloud', 'bordeaux', 'butter', 'lilac', 'terracotta', 'gem', 'powdered', 'fuchsia'] as const
const SPECIAL_PALETTE_KEYS = ['aquarii', 'dino', 'dunkin', 'mari'] as const

function Action({ icon, label, onClick, active }: { icon: IconName; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold text-ink-700 transition-colors hover:bg-white aria-pressed:bg-blush-100 aria-pressed:text-blush-700">
      <Icon name={icon} />
      {label}
    </button>
  )
}

function Eyedropper({ onPick }: { onPick: (hex: string) => void }) {
  const [src, setSrc] = useState<string | null>(null)
  const img = useRef<HTMLImageElement>(null)
  return (
    <div className="space-y-2">
      <label className="file-pick btn w-full border border-dashed border-cream-300">
        <Icon name="pipette" /> {t('palette.eyedropper')}
        <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const blob = await resizeImage(file, 600).catch(() => null)
          if (blob) setSrc(URL.createObjectURL(blob))
          else toast(t('toast.photoFailed'))
        }} />
      </label>
      {src ? (
        <button
          type="button"
          className="block w-full cursor-crosshair overflow-hidden rounded-xl"
          aria-label={t('palette.pickFromPhoto')}
          onClick={(e) => {
            const el = img.current!
            const rect = el.getBoundingClientRect()
            const fromKeyboard = e.detail === 0
            const x = fromKeyboard ? 0.5 : (e.clientX - rect.left) / rect.width
            const y = fromKeyboard ? 0.5 : (e.clientY - rect.top) / rect.height
            onPick(pickColor(el, x * el.naturalWidth, y * el.naturalHeight))
          }}
        >
          <img ref={img} src={src} alt="" className="w-full" />
        </button>
      ) : (
        <p className="text-xs text-ink-500">{t('palette.eyedropperHint')}</p>
      )}
    </div>
  )
}

function Palettes({ selection }: { selection: Item[] }) {
  const items = useEditor((s) => s.doc.items)
  const updateItems = useEditor((s) => s.updateItems)
  const target = selection.length ? selection : items
  const recolor = (map: Map<string, Item['c']>) => updateItems([...map.keys()], (i) => ({ c: map.get(i.id)! }))
  return (
    <Field label={t('palette.title')}>
      {[PALETTE_KEYS, SPECIAL_PALETTE_KEYS].map((keys, section) => (
        <Fragment key={section}>
          {section > 0 && <div className="field-label pt-1">{t('palette.special')}</div>}
          <div className="grid grid-cols-2 gap-2">
            {keys.map((key) => (
              <button key={key} type="button" onClick={() => recolor(applyPalette(target, PALETTES[key]))} className="flex items-center gap-2 rounded-xl bg-white/60 px-2 py-1.5 text-left text-xs font-semibold text-ink-700 hover:bg-white" aria-label={`${t(`palette.${key}`)}: ${t('palette.apply', { target: selection.length ? t('palette.selection') : t('palette.all') })}`}>
                <span className="flex -space-x-1.5">
                  {PALETTES[key].slice(0, 4).map((c) => (
                    <span key={c} className="h-4 w-4 rounded-full border border-white" style={{ background: c }} />
                  ))}
                </span>
                {t(`palette.${key}`)}
              </button>
            ))}
          </div>
        </Fragment>
      ))}
      <button type="button" className="btn mt-1 w-full border border-cream-300" onClick={() => recolor(harmonize(target))}>
        <Icon name="palette" /> {t('palette.harmonize')}
      </button>
      <Eyedropper onPick={(hex) => updateItems(target.map((i) => i.id), (i) => ({ c: i.c.length > 1 ? [hex, i.c[1]] : [hex] }))} />
    </Field>
  )
}

function PolaroidPhoto({ items }: { items: Item[] }) {
  const photos = useEditor((s) => s.doc.media.photos)
  const urls = useMedia((s) => s.urls)
  const addLocal = useMedia((s) => s.addLocal)
  const updateItems = useEditor((s) => s.updateItems)
  const ids = items.filter((i) => i.t === 'polaroid').map((i) => i.id)
  if (!ids.length) return null
  return (
    <Field label={t('edit.photo')}>
      <div className="flex flex-wrap gap-2">
        {photos.map((ref) => (
          <button key={ref} type="button" onClick={() => updateItems(ids, () => ({ photo: ref }))} className="h-14 w-14 overflow-hidden rounded-lg border-2 border-white shadow" aria-label={t('edit.choosePhoto')}>
            <img src={urls[ref]} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
        <label className="file-pick btn h-14 w-14 border border-dashed border-cream-300 px-0">
          <Icon name="plus" />
          <input type="file" accept="image/*" className="sr-only" aria-label={t('gift.addPhoto')} onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const blob = await resizeImage(file).catch(() => null)
            if (!blob) return toast(t('toast.photoFailed'))
            const ref = addLocal(blob, 'photo')
            updateItems(ids, () => ({ photo: ref }))
          }} />
        </label>
      </div>
    </Field>
  )
}

export function EditTab() {
  const items = useEditor((s) => s.doc.items)
  const selectedIds = useEditor((s) => s.selected)
  const store = useEditor.getState
  const selection = items.filter((i) => selectedIds.includes(i.id))
  const first = selection[0]
  if (!first)
    return (
      <div className="space-y-6">
        <p className="rounded-2xl bg-white/60 p-4 text-sm text-ink-500">{t('edit.none')}</p>
        <Palettes selection={[]} />
      </div>
    )
  const ids = selection.map((i) => i.id)
  const update = (patch: (i: Item) => Partial<Item>, key?: string) => store().updateItems(ids, patch, key)
  const kinds = [...new Set(selection.map((i) => i.t))]
  const info = SPECIES[first.t]
  const allLocked = selection.every((i) => i.locked)
  const allHidden = selection.every((i) => i.hidden)
  const grouped = selection.some((i) => i.group)
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <SpeciesGlyph id={first.t} size={44} colors={kinds.length === 1 ? first.c : undefined} />
        <div className="min-w-0">
          <h3 className="font-display text-xl leading-tight">{kinds.length === 1 ? info.name : t('edit.selected', { count: selection.length })}</h3>
          {kinds.length === 1 && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
              <Icon name="info" size={13} />
              <span>
                {t('edit.meaning')}: {info.meaning}
              </span>
            </p>
          )}
          {kinds.length === 1 && selection.length > 1 && <p className="text-xs text-ink-500">{t('edit.selected', { count: selection.length })}</p>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-white/50 p-1">
        <Action icon="copy" label={t('edit.duplicate')} onClick={() => store().duplicateSelected()} />
        <Action icon="mirror" label={t('edit.mirror')} onClick={() => store().mirrorSelected()} />
        <Action icon="group" label={grouped ? t('edit.ungroup') : t('edit.group')} onClick={() => (grouped ? store().ungroup() : store().group())} active={grouped} />
        <Action icon={allLocked ? 'unlock' : 'lock'} label={allLocked ? t('edit.unlock') : t('edit.lock')} onClick={() => store().toggle('locked')} active={allLocked} />
        <Action icon={allHidden ? 'eye' : 'eyeOff'} label={allHidden ? t('edit.show') : t('edit.hide')} onClick={() => store().toggle('hidden')} active={allHidden} />
        <Action icon="trash" label={t('edit.delete')} onClick={() => store().removeSelected()} />
        {kinds.length === 1 && <div className="col-span-2 flex items-center"><button type="button" className="chip w-full" onClick={() => store().selectMany(items.filter((i) => i.t === first.t).map((i) => i.id))}>{t('edit.selectSame', { name: info.name })}</button></div>}
      </div>

      {info.category !== 'filler' && <Slider label={t('edit.bloom')} value={first.stage} min={0} max={1} onChange={(v) => update(() => ({ stage: v }), 'stage')} format={(v) => `${Math.round(v * 100)}%`} />}

      <Field label={t('edit.colors')}>
        <div className="flex flex-wrap gap-1.5">
          {info.presets.map(([a, b]) => (
            <button key={a + b} type="button" onClick={() => update(() => ({ c: [a, b] }))} className="h-8 w-8 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110" style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }} aria-label={`${a} ${b}`} />
          ))}
        </div>
        <ColorField label={t('edit.colors')} value={first.c[0]} onChange={(hex) => update((i) => ({ c: i.c.length > 1 ? [hex, i.c[1]] : [hex] }), 'c0')} />
        <Toggle label={t('edit.twoTone')} checked={first.c.length > 1} onChange={(on) => update((i) => ({ c: on ? [i.c[0], SPECIES[i.t].presets[0][1]] : [i.c[0]] }))} />
        {first.c.length > 1 && <ColorField label={`${t('edit.colors')} 2`} value={first.c[1]} onChange={(hex) => update((i) => ({ c: [i.c[0], hex] }), 'c1')} />}
      </Field>

      <Field label={t('edit.finish')}>
        <Segmented label={t('edit.finish')} value={first.finish} options={FINISHES.map((f) => ({ value: f, label: t(`finish.${f}`) }))} onChange={(finish) => update(() => ({ finish }))} />
      </Field>

      <div className="space-y-3">
        <Slider label={t('edit.size')} value={first.s} min={0.3} max={2.5} onChange={(v) => update(() => ({ s: v }), 's')} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label={t('edit.stem')} value={first.l} min={0.3} max={2} onChange={(v) => update(() => ({ l: v }), 'l')} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label={t('edit.tilt')} value={first.r[0]} min={-Math.PI} max={Math.PI} onChange={(v) => update((i) => ({ r: [v, i.r[1], i.r[2]] }), 'r0')} format={deg} />
        <Slider label={t('edit.spin')} value={first.r[1]} min={-Math.PI} max={Math.PI} onChange={(v) => update((i) => ({ r: [i.r[0], v, i.r[2]] }), 'r1')} format={deg} />
        <Slider label={t('edit.lean')} value={first.r[2]} min={-Math.PI} max={Math.PI} onChange={(v) => update((i) => ({ r: [i.r[0], i.r[1], v] }), 'r2')} format={deg} />
        <Slider label={t('edit.leaves')} value={first.leaves} min={0} max={6} step={1} onChange={(v) => update(() => ({ leaves: v }), 'leaves')} format={(v) => String(v)} />
      </div>

      <PolaroidPhoto items={selection} />
      <Palettes selection={selection} />
    </div>
  )
}
