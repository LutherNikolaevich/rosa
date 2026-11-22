import { t } from '../i18n'

export function Wilted() {
  return (
    <main className="grid min-h-full place-items-center bg-gradient-to-b from-cream-100 to-cream-200 px-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="font-display text-3xl">{t('wilted.title')}</h1>
        <p className="text-ink-500">{t('wilted.body')}</p>
        <a href="/" className="btn-primary mt-2 pointer-coarse:h-11 pointer-coarse:px-5">
          {t('wilted.cta')}
        </a>
      </div>
    </main>
  )
}

export function NoWebGL({ image }: { image?: string }) {
  return (
    <main className="grid min-h-full place-items-center px-6 text-center">
      <div className="max-w-md space-y-4">
        {image && <img src={image} alt="" width={1200} height={630} fetchPriority="high" className="mx-auto h-auto w-full rounded-3xl shadow-xl" />}
        <h1 className="font-display text-2xl">{t('nowebgl.title')}</h1>
        <p className="text-ink-500">{t('nowebgl.body')}</p>
      </div>
    </main>
  )
}

export const hasWebGL = (() => {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
})()
