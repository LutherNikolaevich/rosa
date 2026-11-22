import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEditor } from '../state/store'
import { sampleBouquet } from '../state/sample'
import { BouquetScene } from '../scene/BouquetScene'
import { sceneApi } from '../scene/sceneApi'
import { LibraryPanel, DRAG_TYPE, useAddFlower } from '../ui/LibraryPanel'
import { Inspector, TabBar, TabPanel, type TabId } from '../ui/Inspector'
import { Toolbar } from '../ui/Toolbar'
import { HistoryBar } from '../ui/HistoryBar'
import { ShareModal } from '../ui/ShareModal'
import { ShortcutSheet } from '../ui/ShortcutSheet'
import { Lasso } from '../ui/Lasso'
import { useKeyboard } from '../ui/useKeyboard'
import { useShakeDetector } from '../ui/useShake'
import { prefersReducedMotion, useMediaQuery } from '../ui/useMediaQuery'
import { summarize } from '../ui/summary'
import { t } from '../i18n'
import type { SpeciesId } from '@/src/state/species'
import { reveal } from '../scene/animation/reveal'

function EmptyState() {
  const empty = useEditor((s) => s.doc.items.length === 0)
  return (
    <AnimatePresence>
      {empty && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="pointer-events-none absolute inset-x-0 bottom-2 top-16 z-10 flex items-center justify-center px-6 lg:bottom-auto lg:top-[22%]">
          <div className="glass pointer-events-auto max-w-sm rounded-3xl p-5 text-center lg:p-6">
            <h2 className="font-display text-xl leading-snug lg:text-2xl">{t('empty.title')}</h2>
            <p className="mt-2 text-sm text-ink-500 max-lg:[@media(max-height:720px)]:hidden">{t('empty.body')}</p>
            <button type="button" className="btn mt-4 border border-cream-300" onClick={() => useEditor.getState().commit(() => sampleBouquet())}>
              {t('empty.sample')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function LiveSummary() {
  const items = useEditor((s) => s.doc.items)
  const [text, setText] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setText(summarize(items)), 600)
    return () => clearTimeout(id)
  }, [items])
  return (
    <p className="sr-only" aria-live="polite">
      {text}
    </p>
  )
}

export function Editor() {
  const doc = useEditor((s) => s.doc)
  const hasSelection = useEditor((s) => s.selected.length > 0)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [tab, setTab] = useState<TabId>('edit')
  const [mobileTab, setMobileTab] = useState<TabId>('flowers')
  const [sheetOpen, setSheetOpen] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [lasso, setLasso] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const add = useAddFlower()
  const openShortcuts = useCallback(() => setShortcutsOpen(true), [])
  useKeyboard(openShortcuts)
  useShakeDetector()
  useEffect(() => {
    reveal.phase = 'idle'
  }, [])
  useEffect(() => {
    if (hasSelection) {
      setTab('edit')
      setMobileTab('edit')
    }
  }, [hasSelection])

  return (
    <main className="relative h-full overflow-hidden bg-cream-100">
      <h1 className="sr-only">{t('app.name')}</h1>
      <div
        ref={stage}
        className={`absolute inset-x-0 top-0 transition-[bottom] duration-300 ease-petal ${desktop ? 'bottom-0' : sheetOpen ? 'bottom-[calc(42dvh+5.5rem)]' : 'bottom-24'}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_TYPE)) e.preventDefault()
        }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData(DRAG_TYPE) as SpeciesId
          if (!id) return
          e.preventDefault()
          add(id, sceneApi.pickDome?.(e.clientX, e.clientY) ?? undefined)
        }}
      >
        <BouquetScene doc={doc} mode="edit" still={new URLSearchParams(location.search).has('still')} onPointerMissed={() => !lasso && useEditor.getState().select(null)} />
        <EmptyState />
      </div>
      <Lasso target={stage} enabled={lasso} />
      <LiveSummary />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3">
        <Toolbar onShare={() => setShareOpen(true)} onShortcuts={openShortcuts} compact={!desktop} lasso={lasso} onLasso={() => setLasso((v) => !v)} />
      </div>

      {desktop ? (
        <>
          <aside aria-label={t('library.title')} className="glass absolute bottom-3 left-3 top-20 z-10 w-72 overflow-hidden rounded-3xl">
            <LibraryPanel />
          </aside>
          <aside aria-label={t('tabs.edit')} className="glass absolute bottom-3 right-3 top-20 z-10 w-80 overflow-hidden rounded-3xl">
            <Inspector tab={tab} onTab={setTab} />
          </aside>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
            <HistoryBar />
          </div>
        </>
      ) : (
        <section aria-label={t(`tabs.${mobileTab}`)} className="glass absolute inset-x-0 bottom-0 z-20 rounded-t-3xl pb-[env(safe-area-inset-bottom)]">
          <button type="button" className="relative flex w-full justify-center pb-1 pt-2 after:absolute after:inset-x-0 after:-top-6.5 after:bottom-0" aria-expanded={sheetOpen} aria-label={sheetOpen ? t('sheet.collapse') : t('sheet.expand')} onClick={() => setSheetOpen((v) => !v)}>
            <span className="h-1.5 w-10 rounded-full bg-cream-300" />
          </button>
          <div className="px-3 pb-2">
            <TabBar tabs={['flowers', 'edit', 'wrap', 'card', 'scene', 'gift']} value={mobileTab} onChange={(id) => (setMobileTab(id), setSheetOpen(true))} idPrefix="sheet" panelId={sheetOpen ? 'sheet-panel' : undefined} />
          </div>
          <AnimatePresence initial={false}>
            {sheetOpen && (
              <motion.div key="sheet-panel" id="sheet-panel" role="tabpanel" aria-labelledby={`sheet-tab-${mobileTab}`} className="overflow-y-auto px-4" initial={{ height: 0 }} animate={{ height: '42dvh' }} exit={{ height: 0 }} transition={{ duration: prefersReducedMotion() ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}>
                <div className="pb-4">
                  <TabPanel tab={mobileTab} compact />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
      <ShortcutSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </main>
  )
}
