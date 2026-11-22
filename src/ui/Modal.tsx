import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'
import { t } from '../i18n'

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={`m-auto max-h-[92dvh] w-[calc(100%-2rem)] ${wide ? 'max-w-2xl' : 'max-w-md'} overflow-hidden rounded-3xl border border-white/70 bg-cream-50 p-0 text-ink-900 shadow-2xl backdrop:bg-ink-900/35 backdrop:backdrop-blur-sm open:animate-[rise_.3s_var(--ease-petal)]`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex items-center justify-between gap-4 px-6 pb-2 pt-5">
            <h2 className="font-display text-2xl">{title}</h2>
            <button type="button" className="btn-icon" onClick={onClose} aria-label={t('share.close')}>
              <Icon name="close" />
            </button>
          </header>
          <div className="overflow-y-auto px-6 pb-6">{children}</div>
        </div>
      )}
    </dialog>
  )
}
