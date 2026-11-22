import { useRef, useState } from 'react'
import { STYLES, emptyBouquet, type Style } from '@/src/state/schema'
import { useEditor, type CameraPreset } from '../state/store'
import { t } from '../i18n'
import { Icon } from './Icon'
import { sfx, setMuted } from '../audio/synth'
import { triggerShake } from './useShake'
import { navigate } from '../screens/router'

const CAMERAS: CameraPreset[] = ['front', 'top', 'close', 'orbit']

const store = useEditor.getState
const divider = <span className="mx-1 h-5 w-px bg-cream-300" aria-hidden />

function ArrangeSelect() {
  const style = useEditor((s) => s.doc.style)
  return (
    <label className="flex items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink-700 hover:bg-cream-200/80">
      <Icon name="flower" />
      <select className="h-9 cursor-pointer bg-transparent pr-1" value={style} onChange={(e) => (store().applyStyle(e.target.value as Style), sfx('rustle'))} aria-label={t('toolbar.arrange')}>
        {STYLES.map((s) => (
          <option key={s} value={s}>{t(`style.${s}`)}</option>
        ))}
      </select>
    </label>
  )
}

function LassoButton({ lasso, onLasso }: { lasso: boolean; onLasso: () => void }) {
  return (
    <button type="button" className="btn-icon" aria-label={t('toolbar.lasso')} aria-pressed={lasso} onClick={onLasso} title={t('shortcuts.lasso')}>
      <Icon name="lasso" />
    </button>
  )
}

function NewButton({ onDone }: { onDone?: () => void }) {
  return (
    <button type="button" className="btn-icon" aria-label={t('toolbar.new')} title={t('toolbar.new')} onClick={() => confirm(t('toolbar.newConfirm')) && (store().commit(() => emptyBouquet()), onDone?.())}>
      <Icon name="refresh" />
    </button>
  )
}

function Tools({ lasso, onLasso, onShortcuts }: { lasso: boolean; onLasso: () => void; onShortcuts: () => void }) {
  const camera = useEditor((s) => s.camera)
  return (
    <>
      {divider}
      <ArrangeSelect />
      <label className="flex items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink-700 hover:bg-cream-200/80">
        <Icon name="camera" />
        <select className="h-9 cursor-pointer bg-transparent pr-1" value={camera} onChange={(e) => store().setCamera(e.target.value as CameraPreset)} aria-label={t('toolbar.camera')}>
          {CAMERAS.map((c) => (
            <option key={c} value={c}>{t(`camera.${c}`)}</option>
          ))}
        </select>
      </label>
      <button type="button" className="btn" onClick={triggerShake}>
        <Icon name="wind" /> {t('toolbar.shake')}
      </button>
      <LassoButton lasso={lasso} onLasso={onLasso} />
      {divider}
      <NewButton />
      <button type="button" className="btn-icon" aria-label={t('toolbar.shortcuts')} onClick={onShortcuts}>
        <Icon name="keyboard" />
      </button>
    </>
  )
}

export function MuteButton({ className = 'btn-icon' }: { className?: string }) {
  const muted = useEditor((s) => s.muted)
  return (
    <button type="button" className={className}aria-label={muted ? t('toolbar.unmute') : t('toolbar.mute')} aria-pressed={muted} onClick={() => (store().setMuted(!muted), setMuted(!muted))}>
      <Icon name={muted ? 'mute' : 'volume'} />
    </button>
  )
}

function MoreTools({ lasso, onLasso }: { lasso: boolean; onLasso: () => void }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = () => (setOpen(false), trigger.current?.focus())
  return (
    <div onKeyDown={(e) => open && e.key === 'Escape' && close()}>
      <button ref={trigger} type="button" className="btn-icon" aria-label={t('toolbar.more')} aria-expanded={open} aria-controls="more-tools" onClick={() => setOpen((v) => !v)}>
        <Icon name="chevronDown" />
      </button>
      {open && (
        <div id="more-tools" className="glass absolute left-1/2 top-full mt-3 flex -translate-x-1/2 items-center gap-1 rounded-full p-1.5">
          <ArrangeSelect />
          <LassoButton lasso={lasso} onLasso={onLasso} />
          <MuteButton />
          <NewButton onDone={close} />
        </div>
      )}
    </div>
  )
}

export function Toolbar({ onShare, onShortcuts, compact, lasso, onLasso }: { onShare: () => void; onShortcuts: () => void; compact: boolean; lasso: boolean; onLasso: () => void }) {
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const empty = useEditor((s) => s.doc.items.length === 0)
  return (
    <header className={`glass pointer-events-auto flex items-center rounded-full py-1.5 pr-1.5 ${compact ? 'gap-0.5 pl-3' : 'gap-1 pl-4'}`}>
      <a href="/" className="mr-2 flex items-baseline gap-1.5 max-[359px]:hidden" aria-label={t('app.name')}>
        <span className="font-display text-xl font-semibold tracking-tight text-blush-700">{t('app.name')}</span>
        {!compact && <span className="hidden text-xs text-ink-500 xl:inline">{t('app.tagline')}</span>}
      </a>
      <button type="button" className="btn-icon" aria-label={t('toolbar.undo')} disabled={!canUndo} onClick={() => store().undo()}>
        <Icon name="undo" />
      </button>
      <button type="button" className="btn-icon" aria-label={t('toolbar.redo')} disabled={!canRedo} onClick={() => store().redo()}>
        <Icon name="redo" />
      </button>
      {compact ? <MoreTools lasso={lasso} onLasso={onLasso} /> : <Tools lasso={lasso} onLasso={onLasso} onShortcuts={onShortcuts} />}
      {!compact && <MuteButton />}
      <button type="button" className={compact ? 'btn-icon' : 'btn'} aria-label={t('toolbar.preview')} onClick={() => navigate('/preview')} disabled={empty}>
        <Icon name="eye" /> {!compact && t('toolbar.preview')}
      </button>
      <button type="button" className="btn-primary" onClick={onShare}>
        <Icon name="send" size={16} /> <span className="whitespace-nowrap">{compact ? t('toolbar.send') : t('toolbar.share')}</span>
      </button>
    </header>
  )
}
