import { useCallback, useEffect, useState } from 'react'
import type { Bouquet } from '@/src/state/schema'
import { editTokenFor, fetchBouquet, type FetchResult } from '../state/share'
import { useEditor } from '../state/store'
import { t } from '../i18n'
import { Icon } from '../ui/Icon'
import { Reveal } from './Reveal'
import { Wilted } from './Wilted'

export type ViewerSource = { kind: 'remote'; id: string } | { kind: 'hash'; state: Bouquet } | { kind: 'preview' }

function Loading() {
  return (
    <main className="grid h-full place-items-center bg-cream-100" aria-busy="true">
      <p className="font-display text-2xl text-ink-700">{t('viewer.loading')}</p>
    </main>
  )
}

function Countdown({ at, to, onDone }: { at: string; to: string; onDone: () => void }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const left = Math.max(0, Date.parse(at) - now)
  const due = left <= 0
  useEffect(() => {
    if (!due) return
    onDone()
    const id = setInterval(onDone, 5000)
    return () => clearInterval(id)
  }, [due, onDone])
  const parts = [Math.floor(left / 86400000), Math.floor(left / 3600000) % 24, Math.floor(left / 60000) % 60, Math.floor(left / 1000) % 60]
  const labels = [t('viewer.days'), t('viewer.hours'), t('viewer.minutes'), t('viewer.seconds')]
  return (
    <main className="grid h-full place-items-center bg-gradient-to-b from-cream-100 to-blush-100 px-6 text-center">
      <div className="space-y-6">
        <div className="relative mx-auto h-36 w-36" aria-hidden>
          <div className="absolute inset-x-0 bottom-0 h-28 rounded-lg bg-blush-300 shadow-xl" />
          <div className="absolute inset-x-[-8px] top-4 h-8 rounded-md bg-blush-500 shadow" />
          <div className="absolute inset-y-4 left-1/2 w-5 -translate-x-1/2 bg-cream-50/90" />
          <div className="absolute -top-2 left-1/2 h-10 w-16 -translate-x-1/2 rounded-full border-[6px] border-cream-50/90" />
        </div>
        <h1 className="font-display text-3xl">{to ? t('viewer.forName', { name: to }) : t('viewer.countdownTitle')}</h1>
        <p className="text-ink-500">{t('viewer.opensOn', { date: new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) })}</p>
        <div className="flex justify-center gap-3" role="timer" aria-live="off">
          {parts.map((n, i) => (
            <div key={labels[i]} className="w-16 rounded-2xl border border-cream-300 bg-cream-50 py-2">
              <div className="font-display text-2xl tabular-nums">{String(n).padStart(2, '0')}</div>
              <div className="text-xs text-ink-500">{labels[i]}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

function SecretGate({ question, to, wrong, onSubmit }: { question: string; to: string; wrong?: boolean; onSubmit: (answer: string) => void }) {
  const [answer, setAnswer] = useState('')
  return (
    <main className="grid h-full place-items-center bg-gradient-to-b from-cream-100 to-cream-200 px-6">
      <form className="w-full max-w-sm space-y-4 rounded-3xl border border-cream-300 bg-cream-50 p-6 text-center shadow-[0_8px_40px_-12px_rgba(80,40,40,0.25)]" onSubmit={(e) => (e.preventDefault(), onSubmit(answer))}>
        <Icon name="lock" size={28} className="mx-auto text-blush-600" />
        <h1 className="font-display text-2xl">{to ? t('viewer.forName', { name: to }) : t('viewer.secretTitle')}</h1>
        <label className="block space-y-2 text-left">
          <span className="block text-center text-ink-700">{question}</span>
          <input className="input" autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} aria-invalid={wrong} />
        </label>
        {wrong && <p role="alert" className="text-sm text-blush-700">{t('viewer.secretWrong')}</p>}
        <button type="submit" className="btn-primary w-full" disabled={!answer.trim()}>
          {t('viewer.unlock')}
        </button>
      </form>
    </main>
  )
}

export function Viewer({ source }: { source: ViewerSource }) {
  const params = new URLSearchParams(location.search)
  const still = params.has('still')
  const embed = params.has('embed')
  const [result, setResult] = useState<FetchResult | { kind: 'loading' }>({ kind: 'loading' })
  const editorDoc = useEditor((s) => s.doc)

  const load = useCallback(
    (answer?: string) => {
      if (source.kind === 'hash') return setResult({ kind: 'ready', state: source.state, media: {}, allowRemix: true, owner: false })
      if (source.kind === 'preview') return setResult({ kind: 'ready', state: useEditor.getState().doc, media: {}, allowRemix: false, owner: false })
      fetchBouquet(source.id, { answer, editToken: editTokenFor(source.id) }).then(setResult)
    },
    [source],
  )
  useEffect(() => load(), [load])

  if (result.kind === 'loading') return <Loading />
  if (result.kind === 'wilted') return <Wilted />
  if (result.kind === 'error')
    return (
      <main className="grid h-full place-items-center px-6 text-center">
        <div className="space-y-4">
          <p className="text-ink-700">{t('viewer.error')}</p>
          <button type="button" className="btn-primary" onClick={() => (setResult({ kind: 'loading' }), load())}>
            {t('viewer.retry')}
          </button>
        </div>
      </main>
    )
  if (result.kind === 'scheduled') return <Countdown at={result.at} to={result.to} onDone={load} />
  if (result.kind === 'secret') return <SecretGate question={result.question} to={result.to} wrong={result.wrong} onSubmit={(a) => load(a)} />
  const state = source.kind === 'preview' ? editorDoc : result.state
  return <Reveal data={{ ...result, state }} id={source.kind === 'remote' ? source.id : null} preview={source.kind === 'preview'} embed={embed} still={still} />
}
