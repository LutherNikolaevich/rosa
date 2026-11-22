import { SPECIES, type SpeciesId } from '@/src/state/species'
import { en, type MessageKey } from './en'

const catalogs: Record<string, Partial<Record<MessageKey, string>>> = { en }
const locale = navigator.language.split('-')[0]
const active = catalogs[locale] ?? en

export function t(key: MessageKey, vars: Record<string, string | number> = {}): string {
  const template = active[key] ?? en[key]
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''))
}

export const speciesName = (id: SpeciesId) => SPECIES[id].name
export const speciesMeaning = (id: SpeciesId) => SPECIES[id].meaning
