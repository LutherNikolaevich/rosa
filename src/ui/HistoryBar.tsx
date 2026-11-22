import { useState } from 'react'
import { useEditor } from '../state/store'
import { t } from '../i18n'
import { Icon } from './Icon'
import { ItemList } from './ItemList'

export function HistoryBar() {
  const position = useEditor((s) => s.past.length)
  const total = useEditor((s) => s.past.length + s.future.length + 1)
  const count = useEditor((s) => s.doc.items.length)
  const jump = useEditor((s) => s.jump)
  const [listOpen, setListOpen] = useState(false)
  return (
    <div className="pointer-events-auto relative">
      {listOpen && (
        <div className="glass absolute bottom-full left-0 mb-2 w-80 rounded-2xl">
          <h3 className="field-label px-4 pt-3">{t('list.title')}</h3>
          <ItemList />
        </div>
      )}
      <div className="glass flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4">
        <button type="button" className="btn" aria-label={t('list.button', { count })} aria-expanded={listOpen} onClick={() => setListOpen((v) => !v)}>
          <Icon name="list" /> {count}
        </button>
        <label className="flex items-center gap-3 text-xs text-ink-500">
          <span className="field-label">{t('history.label')}</span>
          <input type="range" min={0} max={Math.max(0, total - 1)} value={position} onChange={(e) => jump(Number(e.target.value))} className="w-40 sm:w-56" aria-valuetext={t('history.step', { index: position + 1, total })} />
          <span className="w-14 tabular-nums">{position + 1}/{total}</span>
        </label>
      </div>
    </div>
  )
}
