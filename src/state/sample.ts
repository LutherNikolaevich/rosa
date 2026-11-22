import { nanoid } from 'nanoid'
import { SPECIES, type SpeciesId } from '@/src/state/species'
import { emptyBouquet, type Bouquet, type Item } from '@/src/state/schema'
import { arrange } from './arrange'

const RECIPE: [SpeciesId, number, number][] = [
  ['rose', 5, 0],
  ['garden-rose', 2, 1],
  ['ranunculus', 2, 3],
  ['babys-breath', 3, 0],
  ['eucalyptus', 3, 0],
  ['ruscus', 2, 0],
]

export function sampleBouquet(seed = Math.floor(Math.random() * 2 ** 31)): Bouquet {
  const base = emptyBouquet(seed)
  const items: Item[] = RECIPE.flatMap(([t, count, preset]) =>
    Array.from({ length: count }, () => ({
      id: nanoid(8).replace(/[^A-Za-z0-9]/g, 'x'),
      t,
      stage: SPECIES[t].category === 'focal' ? 0.85 : 1,
      c: [...SPECIES[t].presets[preset % SPECIES[t].presets.length]],
      finish: 'natural' as const,
      p: [0, 0, 0] as Item['p'],
      r: [0, 0, 0] as Item['r'],
      s: 1,
      l: 1,
      leaves: SPECIES[t].category === 'focal' ? 2 : 0,
      group: null,
      locked: false,
      hidden: false,
    })),
  )
  return { ...base, card: { ...base.card, to: 'Ana', body: 'Happy birthday! I hope today feels as warm as you make everyone feel.', from: 'J' }, items: arrange(items, 'round', seed) }
}
