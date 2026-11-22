import { INTROS, type Bouquet } from '@/src/state/schema'
import { useEditor } from '../state/store'
import { resizeImage, useMedia } from '../state/media'
import { t } from '../i18n'
import { Field, Segmented } from './fields'
import { Icon } from './Icon'
import { VoiceRecorder } from './VoiceRecorder'
import { toast } from './toast'

const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function GiftTab() {
  const media = useEditor((s) => s.doc.media)
  const reveal = useEditor((s) => s.doc.reveal)
  const commit = useEditor((s) => s.commit)
  const urls = useMedia((s) => s.urls)
  const addLocal = useMedia((s) => s.addLocal)
  const setMedia = (patch: Partial<Bouquet['media']>, key?: string) => commit((d) => ({ ...d, media: { ...d.media, ...patch } }), key && `media.${key}`)
  const setReveal = (patch: Partial<Bouquet['reveal']>) => commit((d) => ({ ...d, reveal: { ...d.reveal, ...patch } }))
  return (
    <div className="space-y-5">
      <Field label={t('gift.photos')} hint={t('gift.photosHint')}>
        <div className="flex flex-wrap gap-2">
          {media.photos.map((ref) => (
            <div key={ref} className="relative h-20 w-20 rotate-[-2deg] rounded-md bg-white p-1 pb-3 shadow">
              <img src={urls[ref]} alt="" className="h-full w-full object-cover" />
              <button type="button" aria-label={t('gift.removePhoto')} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink-900 text-white after:absolute after:-inset-2.5" onClick={() => setMedia({ photos: media.photos.filter((p) => p !== ref) })}>
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
          {media.photos.length < 3 && (
            <label className="file-pick grid h-20 w-20 cursor-pointer place-items-center rounded-md border border-dashed border-cream-300 text-ink-500 hover:border-blush-300">
              <Icon name="image" />
              <input type="file" accept="image/*" className="sr-only" aria-label={t('gift.addPhoto')} onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const blob = await resizeImage(file).catch(() => null)
                e.target.value = ''
                if (!blob) return toast(t('toast.photoFailed'))
                const ref = addLocal(blob, 'photo')
                setMedia({ photos: [...useEditor.getState().doc.media.photos, ref].slice(0, 3) })
              }} />
            </label>
          )}
        </div>
      </Field>
      <Field label={t('gift.voice')}>
        <VoiceRecorder url={media.voice ? urls[media.voice] : undefined} onRecorded={(blob) => setMedia({ voice: addLocal(blob, 'voice') })} onRemove={() => setMedia({ voice: null })} />
        <label className="block space-y-1">
          <span className="text-xs text-ink-500">{t('gift.transcript')}</span>
          <textarea className="input min-h-16" maxLength={2000} value={media.transcript} onChange={(e) => setMedia({ transcript: e.target.value }, 'transcript')} />
        </label>
      </Field>
      <Field label={t('gift.intro')}>
        <Segmented label={t('gift.intro')} value={reveal.intro} options={INTROS.map((i) => ({ value: i, label: t(`intro.${i}`) }))} onChange={(intro) => setReveal({ intro })} />
      </Field>
      <Field label={t('gift.schedule')} hint={t('gift.scheduleHint')}>
        <input type="datetime-local" className="input" aria-label={t('gift.schedule')} value={toLocalInput(reveal.at)} min={toLocalInput(new Date().toISOString())} onChange={(e) => setReveal({ at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
      </Field>
    </div>
  )
}
