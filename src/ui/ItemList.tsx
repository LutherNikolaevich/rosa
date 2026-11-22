import { useEditor } from '../state/store'
import { t } from '../i18n'
import { describeItem } from './summary'
import { Icon } from './Icon'

export function ItemList() {
  const items = useEditor((s) => s.doc.items)
  const selected = useEditor((s) => s.selected)
  const select = useEditor((s) => s.select)
  if (!items.length) return <p className="p-4 text-sm text-ink-500">{t('list.empty')}</p>
  return (
    <ul role="listbox" aria-multiselectable="true" aria-label={t('list.title')} className="max-h-64 space-y-0.5 overflow-y-auto p-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          role="option"
          aria-selected={selected.includes(item.id)}
          tabIndex={0}
          onClick={(e) => select(item.id, e.shiftKey || e.metaKey || e.ctrlKey)}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault()
              select(item.id, e.shiftKey || e.metaKey || e.ctrlKey || e.key === ' ')
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              const sibling = (e.currentTarget as HTMLElement)[e.key === 'ArrowDown' ? 'nextElementSibling' : 'previousElementSibling'] as HTMLElement | null
              sibling?.focus()
            }
          }}
          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-white aria-selected:bg-blush-100 aria-selected:text-blush-700"
        >
          <span className="h-3 w-3 shrink-0 rounded-full border border-white shadow-sm" style={{ background: item.c[0] }} />
          <span className="flex-1 capitalize">
            {index + 1}. {describeItem(item)}
            {item.stage < 1 ? ` · ${Math.round(item.stage * 100)}%` : ''}
          </span>
          {item.locked && <Icon name="lock" size={14} />}
          {item.hidden && <Icon name="eyeOff" size={14} />}
        </li>
      ))}
    </ul>
  )
}
