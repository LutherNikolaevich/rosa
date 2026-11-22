import { Bloom, DepthOfField, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { QualityProfile } from '../state/quality'

export function PostFX({ profile, focus }: { profile: QualityProfile; focus: [number, number, number] | null }) {
  if (!profile.bloom && !profile.ao) return null
  return (
    <EffectComposer multisampling={profile.ao ? 0 : 4} enableNormalPass={false}>
      <>{profile.ao && <N8AO halfRes aoRadius={0.35} intensity={1.6} distanceFalloff={0.6} quality="performance" />}</>
      <>{profile.dof && focus && <DepthOfField target={focus} focusRange={4} bokehScale={2.2} />}</>
      <>{profile.bloom && <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.92} luminanceSmoothing={0.2} />}</>
      <Vignette offset={0.35} darkness={0.35} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
