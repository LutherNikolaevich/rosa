import { CARD_SHAPES, type Bouquet } from '@/src/state/schema'
import { useEditor } from '../state/store'
import { useMedia } from '../state/media'
import { t } from '../i18n'
import { ColorField, Field, Segmented, Slider } from './fields'
import { FontSelect } from './WrapTab'
import { SignaturePad } from './SignaturePad'

export function CardTab() {
  const card = useEditor((s) => s.doc.card)
  const commit = useEditor((s) => s.commit)
  const urls = useMedia((s) => s.urls)
  const addLocal = useMedia((s) => s.addLocal)
  const set = (patch: Partial<Bouquet['card']>, key?: string) => commit((d) => ({ ...d, card: { ...d.card, ...patch } }), key && `card.${key}`)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('card.to')}>
          <input className="input" maxLength={40} value={card.to} onChange={(e) => set({ to: e.target.value }, 'to')} placeholder={t('card.toPlaceholder')} aria-label={t('card.to')} />
        </Field>
        <Field label={t('card.from')}>
          <input className="input" maxLength={40} value={card.from} onChange={(e) => set({ from: e.target.value }, 'from')} aria-label={t('card.from')} />
        </Field>
      </div>
      <Field label={t('card.message')} hint={t('card.chars', { count: card.body.length })}>
        <textarea className="input min-h-32 resize-y leading-relaxed" maxLength={1000} value={card.body} placeholder={t('card.messagePlaceholder')} aria-label={t('card.message')} onChange={(e) => set({ body: e.target.value }, 'body')} />
      </Field>
      <Field label={t('card.shape')}>
        <Segmented label={t('card.shape')} value={card.shape} options={CARD_SHAPES.map((s) => ({ value: s, label: t(`card.${s}`) }))} onChange={(shape) => set({ shape })} />
      </Field>
      <Field label={t('card.font')}>
        <FontSelect label={t('card.font')} value={card.font} onChange={(font) => set({ font })} />
      </Field>
      <Field label={t('card.ink')}>
        <ColorField label={t('card.ink')} value={card.ink} onChange={(ink) => set({ ink }, 'ink')} />
      </Field>
      <Slider label={t('card.size')} value={card.size} min={0.8} max={1.6} onChange={(size) => set({ size }, 'size')} format={(v) => `${Math.round(v * 100)}%`} />
      <Field label={t('card.signature')}>
        {card.sig && urls[card.sig] ? (
          <div className="space-y-2">
            <img src={urls[card.sig]} alt={t('card.signature')} className="h-24 rounded-xl bg-white object-contain p-2" />
            <button type="button" className="btn border border-cream-300" onClick={() => set({ sig: null })}>
              {t('card.removeSignature')}
            </button>
          </div>
        ) : (
          <SignaturePad ink={card.ink} onSave={(blob) => set({ sig: addLocal(blob, 'sig') })} />
        )}
      </Field>
    </div>
  )
}
