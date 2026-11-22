import { Modal } from './Modal'
import { t } from '../i18n'
import type { MessageKey } from '../i18n/en'

const ROWS: [string, MessageKey][] = [
  ['Delete', 'shortcuts.delete'],
  ['D', 'shortcuts.duplicate'],
  ['G / Shift G', 'shortcuts.group'],
  ['M', 'shortcuts.mirror'],
  ['L / H', 'shortcuts.lock'],
  ['⌘/Ctrl Z · Shift ⌘/Ctrl Z', 'shortcuts.undo'],
  ['⌘/Ctrl C · V', 'shortcuts.copy'],
  ['⌘/Ctrl A', 'shortcuts.all'],
  ['← → ↑ ↓', 'shortcuts.nudge'],
  ['Shift + drag', 'shortcuts.lasso'],
  ['Esc', 'shortcuts.escape'],
  ['?', 'shortcuts.help'],
]

export function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={t('shortcuts.title')}>
      <dl className="divide-y divide-cream-200">
        {ROWS.map(([keys, label]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <dt className="text-ink-700">{t(label)}</dt>
            <dd>
              <kbd className="rounded-md border border-cream-300 bg-white px-2 py-0.5 font-mono text-xs text-ink-700">{keys}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}
