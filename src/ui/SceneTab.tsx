import { ENVS, MUSIC, PARTICLES } from '@/src/state/schema'
import { useEditor, type CameraPreset, type Quality } from '../state/store'
import { PRESETS } from '../scene/Environment'
import { t } from '../i18n'
import { Field, Segmented, Slider } from './fields'
import { Icon } from './Icon'
import { playMusic, setMusicVolume, stopMusic } from '../audio/synth'
import { triggerShake } from './useShake'

const CAMERAS: CameraPreset[] = ['front', 'top', 'close', 'orbit']
const QUALITIES: Quality[] = ['auto', 'low', 'medium', 'high', 'ultra']

export function SceneTab() {
  const scene = useEditor((s) => s.doc.scene)
  const commit = useEditor((s) => s.commit)
  const camera = useEditor((s) => s.camera)
  const quality = useEditor((s) => s.quality)
  const setScene = (patch: Partial<typeof scene>, key?: string) => commit((d) => ({ ...d, scene: { ...d.scene, ...patch } }), key && `scene.${key}`)
  return (
    <div className="space-y-5">
      <Field label={t('scene.environment')}>
        <div className="grid grid-cols-2 gap-2">
          {ENVS.map((env) => (
            <button key={env} type="button" aria-pressed={scene.env === env} onClick={() => setScene({ env, particles: env === 'night' ? 'fireflies' : env === 'starry' ? 'stars' : env === 'golden-hour' ? 'petals' : scene.particles })} className="overflow-hidden rounded-2xl border-2 border-transparent text-left text-xs font-semibold text-ink-700 shadow-sm transition-all aria-pressed:border-blush-600">
              <span className="block h-12" style={{ background: `linear-gradient(180deg, ${PRESETS[env].sky[0]}, ${PRESETS[env].sky[1]})` }} />
              <span className="block bg-white/80 px-2 py-1.5">{t(`scene.${env}`)}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label={t('scene.particles')}>
        <Segmented label={t('scene.particles')} value={scene.particles} options={PARTICLES.map((p) => ({ value: p, label: t(`particles.${p}`) }))} onChange={(particles) => setScene({ particles })} />
      </Field>
      <Slider label={t('scene.wind')} value={scene.wind} min={0} max={1} onChange={(wind) => setScene({ wind }, 'wind')} format={(v) => `${Math.round(v * 100)}%`} />
      <Field label={t('scene.music')}>
        <Segmented
          label={t('scene.music')}
          value={scene.music}
          options={MUSIC.map((m) => ({ value: m, label: t(`music.${m}`) }))}
          onChange={(music) => {
            setScene({ music })
            if (music === 'none') stopMusic()
            else playMusic(music, scene.volume)
          }}
        />
        {scene.music !== 'none' && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Slider label={t('scene.volume')} value={scene.volume} min={0} max={1} onChange={(volume) => (setScene({ volume }, 'volume'), setMusicVolume(volume))} format={(v) => `${Math.round(v * 100)}%`} />
            </div>
            <button type="button" className="btn-icon" aria-label={t('gift.stop')} onClick={stopMusic}>
              <Icon name="stop" size={16} />
            </button>
          </div>
        )}
      </Field>
      <Field label={t('toolbar.camera')}>
        <Segmented label={t('toolbar.camera')} value={camera} options={CAMERAS.map((c) => ({ value: c, label: t(`camera.${c}`) }))} onChange={(c) => useEditor.getState().setCamera(c)} />
      </Field>
      <Field label={t('toolbar.quality')}>
        <Segmented label={t('toolbar.quality')} value={quality} options={QUALITIES.map((q) => ({ value: q, label: t(`quality.${q}`) }))} onChange={(q) => useEditor.getState().setQuality(q)} />
      </Field>
      <Field label={t('toolbar.shake')} hint={t('scene.shakeHint')}>
        <button type="button" className="btn border border-cream-300" onClick={triggerShake}>
          <Icon name="wind" /> {t('toolbar.shake')}
        </button>
      </Field>
    </div>
  )
}
