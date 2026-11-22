import { FONTS, PATTERNS, RIBBONS, WRAPS, type Bouquet } from '@/src/state/schema'
import { useEditor } from '../state/store'
import { t } from '../i18n'
import { ColorField, Field, Segmented, Slider } from './fields'
import { Icon } from './Icon'
import { sfx } from '../audio/synth'
import { FONT_FAMILY } from '../scene/fonts'

export function FontSelect({ value, onChange, label }: { value: Bouquet['wrap']['font']; onChange: (v: Bouquet['wrap']['font']) => void; label: string }) {
  return (
    <select className="input" aria-label={label} value={value} onChange={(e) => onChange(e.target.value as Bouquet['wrap']['font'])} style={{ fontFamily: FONT_FAMILY[value] }}>
      {FONTS.map((f) => (
        <option key={f} value={f} style={{ fontFamily: FONT_FAMILY[f] }}>
          {t(`font.${f}`)}
        </option>
      ))}
    </select>
  )
}

export function WrapTab() {
  const wrap = useEditor((s) => s.doc.wrap)
  const ribbon = useEditor((s) => s.doc.ribbon)
  const commit = useEditor((s) => s.commit)
  const setWrap = (patch: Partial<Bouquet['wrap']>, key?: string) => commit((d) => ({ ...d, wrap: { ...d.wrap, ...patch } }), key && `wrap.${key}`)
  const setRibbon = (patch: Partial<Bouquet['ribbon']>, key?: string) => commit((d) => ({ ...d, ribbon: { ...d.ribbon, ...patch } }), key && `ribbon.${key}`)
  return (
    <div className="space-y-5">
      <Field label={t('wrap.style')}>
        <Segmented label={t('wrap.style')} value={wrap.t} options={WRAPS.map((w) => ({ value: w, label: t(`wrap.${w}`) }))} onChange={(v) => (setWrap({ t: v }), sfx('crinkle'))} />
      </Field>
      {wrap.t !== 'none' && (
        <>
          <Field label={t('wrap.colors')}>
            {wrap.colors.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <ColorField label={`${t('wrap.colors')} ${i + 1}`} value={c} onChange={(hex) => setWrap({ colors: wrap.colors.map((x, k) => (k === i ? hex : x)) }, `c${i}`)} />
                </div>
                {wrap.colors.length > 1 && (
                  <button type="button" className="btn-icon" aria-label={`${t('edit.delete')} ${i + 1}`} onClick={() => setWrap({ colors: wrap.colors.filter((_, k) => k !== i) })}>
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            ))}
            {wrap.colors.length < 3 && (
              <button type="button" className="btn border border-dashed border-cream-300" onClick={() => setWrap({ colors: [...wrap.colors, '#ffffff'] })}>
                <Icon name="plus" /> {t('wrap.colors')}
              </button>
            )}
          </Field>
          <Field label={t('wrap.pattern')}>
            <Segmented label={t('wrap.pattern')} value={wrap.pattern} options={PATTERNS.map((p) => ({ value: p, label: t(`pattern.${p}`) }))} onChange={(pattern) => setWrap({ pattern })} />
          </Field>
          <Field label={t('wrap.text')}>
            <input className="input" maxLength={40} value={wrap.text} placeholder={t('wrap.textPlaceholder')} aria-label={t('wrap.text')} onChange={(e) => setWrap({ text: e.target.value, pattern: e.target.value ? 'text' : wrap.pattern }, 'text')} />
            <FontSelect label={t('wrap.font')} value={wrap.font} onChange={(font) => setWrap({ font })} />
          </Field>
          <Slider label={t('wrap.layers')} value={wrap.layers} min={1} max={5} step={1} onChange={(layers) => setWrap({ layers }, 'layers')} format={String} />
          <Slider label={t('wrap.crinkle')} value={wrap.crinkle} min={0} max={1} onChange={(crinkle) => setWrap({ crinkle }, 'crinkle')} format={(v) => `${Math.round(v * 100)}%`} />
        </>
      )}
      <hr className="border-cream-300" />
      <Field label={t('ribbon.title')}>
        <Segmented label={t('ribbon.title')} value={ribbon.t} options={RIBBONS.map((r) => ({ value: r, label: t(`ribbon.${r}`) }))} onChange={(v) => (setRibbon({ t: v }), sfx('tie'))} />
      </Field>
      <ColorField label={t('ribbon.color')} value={ribbon.c} onChange={(c) => setRibbon({ c }, 'c')} />
      <Slider label={t('ribbon.length')} value={ribbon.len} min={0.3} max={2} onChange={(len) => setRibbon({ len }, 'len')} format={(v) => `${Math.round(v * 100)}%`} />
      <Field label={t('ribbon.text')}>
        <input className="input" maxLength={30} aria-label={t('ribbon.text')} value={ribbon.text} onChange={(e) => setRibbon({ text: e.target.value }, 'text')} />
      </Field>
    </div>
  )
}
