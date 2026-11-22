import type { ReactNode } from 'react'
import { t } from '../i18n'
import { Icon, type IconName } from './Icon'
import { EditTab } from './EditTab'
import { WrapTab } from './WrapTab'
import { CardTab } from './CardTab'
import { SceneTab } from './SceneTab'
import { GiftTab } from './GiftTab'
import { LibraryPanel } from './LibraryPanel'

export type TabId = 'flowers' | 'edit' | 'wrap' | 'card' | 'scene' | 'gift'

export const TABS: { id: TabId; icon: IconName }[] = [
  { id: 'flowers', icon: 'flower' },
  { id: 'edit', icon: 'edit' },
  { id: 'wrap', icon: 'wrap' },
  { id: 'card', icon: 'card' },
  { id: 'scene', icon: 'scene' },
  { id: 'gift', icon: 'gift' },
]

export function TabPanel({ tab, compact }: { tab: TabId; compact?: boolean }): ReactNode {
  if (tab === 'flowers') return <LibraryPanel compact={compact} />
  if (tab === 'edit') return <EditTab />
  if (tab === 'wrap') return <WrapTab />
  if (tab === 'card') return <CardTab />
  if (tab === 'scene') return <SceneTab />
  return <GiftTab />
}

export function TabBar({ tabs, value, onChange, idPrefix, panelId }: { tabs: TabId[]; value: TabId; onChange: (t: TabId) => void; idPrefix: string; panelId?: string }) {
  const visible = TABS.filter((x) => tabs.includes(x.id))
  const move = (step: number) => {
    const index = visible.findIndex((x) => x.id === value)
    const next = visible[(index + step + visible.length) % visible.length].id
    onChange(next)
    document.getElementById(`${idPrefix}-tab-${next}`)?.focus()
  }
  return (
    <div
      role="tablist"
      aria-label={t('tabs.label')}
      className="flex gap-0.5 rounded-2xl bg-cream-200/70 p-1"
      onKeyDown={(e) => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
        if (!step) return
        e.preventDefault()
        move(step)
      }}
    >
      {visible.map(({ id, icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${id}`}
          aria-selected={value === id}
          tabIndex={value === id ? 0 : -1}
          aria-controls={panelId}
          onClick={() => onChange(id)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-xs font-semibold text-ink-500 transition-colors aria-selected:bg-white aria-selected:text-ink-900 aria-selected:shadow-sm"
        >
          <Icon name={icon} size={15} />
          <span>{t(`tabs.${id}`)}</span>
        </button>
      ))}
    </div>
  )
}

export function Inspector({ tab, onTab }: { tab: TabId; onTab: (t: TabId) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <TabBar tabs={['edit', 'wrap', 'card', 'scene', 'gift']} value={tab} onChange={onTab} idPrefix="inspector" panelId="inspector-panel" />
      </div>
      <div id="inspector-panel" role="tabpanel" aria-labelledby={`inspector-tab-${tab}`} className="flex-1 overflow-y-auto px-4 pb-6">
        <TabPanel tab={tab} />
      </div>
    </div>
  )
}
