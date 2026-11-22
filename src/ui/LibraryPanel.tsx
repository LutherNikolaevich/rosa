import { useMemo, useState } from 'react'
import { MAX_ITEMS, SOFT_MAX_ITEMS } from '@/src/state/schema'
import { SPECIES, SPECIES_IDS, type Category, type SpeciesId } from '@/src/state/species'
import { useEditor } from '../state/store'
import { t } from '../i18n'
import { toast } from './toast'
import { sfx } from '../audio/synth'
import { SpeciesGlyph } from './SpeciesGlyph'

const CATEGORIES: Category[] = ['focal', 'secondary', 'filler', 'accent']
const CATEGORY_LABEL = { focal: 'library.focal', secondary: 'library.secondary', filler: 'library.filler', accent: 'library.accent' } as const

export const DRAG_TYPE = 'application/x-rosa-species'

export function useAddFlower() {
  const addItem = useEditor((s) => s.addItem)
  return (id: SpeciesId, point?: Parameters<typeof addItem>[1]) => {
    const count = useEditor.getState().doc.items.length
    if (count >= MAX_ITEMS) return toast(t('toast.hardCap'))
    addItem(id, point)
    sfx('rustle')
    navigator.vibrate?.(10)
    if (count + 1 === SOFT_MAX_ITEMS + 1) toast(t('toast.softCap'))
  }
}

export function LibraryPanel({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState('')
  const add = useAddFlower()
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATEGORIES.map((category) => ({ category, ids: SPECIES_IDS.filter((id) => SPECIES[id].category === category && (!q || SPECIES[id].name.toLowerCase().includes(q) || SPECIES[id].meaning.toLowerCase().includes(q))) })).filter((g) => g.ids.length)
  }, [query])
  return (
    <div className="flex h-full flex-col">
      <div className={compact ? 'px-1 pb-3' : 'px-4 pb-3 pt-4'}>
        {!compact && <h2 className="mb-0.5 font-display text-xl">{t('library.title')}</h2>}
        {!compact && <p className="mb-3 text-xs text-ink-500">{t('library.hint')}</p>}
        <input type="search" className="input" placeholder={t('library.search')} aria-label={t('library.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className={`flex-1 space-y-5 overflow-y-auto ${compact ? 'px-1' : 'px-4'} pb-4`}>
        {groups.map(({ category, ids }) => (
          <section key={category} aria-label={t(CATEGORY_LABEL[category])}>
            <h3 className="field-label mb-2">{t(CATEGORY_LABEL[category])}</h3>
            <ul className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {ids.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_TYPE, id)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    onClick={() => add(id)}
                    title={SPECIES[id].meaning}
                    aria-label={t('library.add', { name: SPECIES[id].name })}
                    className="flex w-full flex-col items-center gap-1 rounded-2xl border border-transparent bg-white/55 px-1 py-2 text-center transition-all duration-200 hover:border-blush-300 hover:bg-white active:scale-95"
                  >
                    <SpeciesGlyph id={id} size={compact ? 34 : 38} />
                    <span className="line-clamp-1 text-[11px] font-semibold leading-tight text-ink-700">{SPECIES[id].name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
