import { t } from '../i18n'

export function Shell() {
  return (
    <main className="grid h-full place-items-center bg-cream-100" aria-busy="true">
      <div className="animate-[rise_600ms_var(--ease-petal)_400ms_both] text-center">
        <p className="font-display text-5xl text-blush-700">{t('app.name')}</p>
        <p className="mt-2 text-sm text-ink-500">{t('app.tagline')}</p>
      </div>
    </main>
  )
}
