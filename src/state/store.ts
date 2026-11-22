import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { BouquetSchema, MAX_ITEMS, emptyBouquet, parseBouquet, type Bouquet, type Item, type Style } from '@/src/state/schema'
import { SPECIES, type SpeciesId } from '@/src/state/species'
import { arrange, nextSlot, placeOnDome } from './arrange'

export type Quality = 'auto' | 'low' | 'medium' | 'high' | 'ultra'
export type CameraPreset = 'front' | 'top' | 'close' | 'orbit'
export interface SharedLink {
  id: string
  editToken: string
}

const HISTORY_LIMIT = 200
const lastMerge = { key: '', at: 0 }
const DRAFT_KEY = 'rosa_draft'
const PREFS_KEY = 'rosa_prefs'

interface EditorState {
  doc: Bouquet
  past: Bouquet[]
  future: Bouquet[]
  gesture: boolean
  selected: string[]
  clipboard: Item[]
  focus: [number, number, number] | null
  camera: CameraPreset
  cameraNonce: number
  quality: Quality
  muted: boolean
  shakeAt: number
  pokes: Record<string, number>
  link: SharedLink | null
  commit: (fn: (doc: Bouquet) => Bouquet, mergeKey?: string) => void
  beginGesture: () => void
  endGesture: () => void
  undo: () => void
  redo: () => void
  jump: (index: number) => void
  load: (doc: Bouquet, link?: SharedLink | null) => void
  select: (id: string | null, additive?: boolean) => void
  selectMany: (ids: string[]) => void
  addItem: (t: SpeciesId, at?: Vector3) => string | null
  updateItems: (ids: string[], patch: (item: Item) => Partial<Item>, mergeKey?: string) => void
  removeSelected: () => void
  duplicateSelected: () => void
  mirrorSelected: () => void
  copy: () => void
  paste: () => void
  group: () => void
  ungroup: () => void
  toggle: (key: 'locked' | 'hidden') => void
  nudge: (dx: number, dy: number, dz: number) => void
  applyStyle: (style: Style) => void
  setCamera: (preset: CameraPreset) => void
  setQuality: (quality: Quality) => void
  setMuted: (muted: boolean) => void
  shake: () => void
  poke: (id: string) => void
  setFocus: (point: [number, number, number] | null) => void
}

const readJson = <T>(key: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

const initialDoc = (): Bouquet => {
  const draft = readJson<unknown>(DRAFT_KEY)
  const parsed = draft ? parseBouquet(draft) : null
  return parsed?.success ? parsed.data : emptyBouquet()
}

const prefs = readJson<{ quality?: Quality; muted?: boolean }>(PREFS_KEY) ?? {}

const newItemId = () => nanoid(8).replace(/[^A-Za-z0-9]/g, 'x')

const mirrorEuler = (r: Item['r']): Item['r'] => {
  const q = new Quaternion().setFromEuler(new Euler(...r))
  const m = new Matrix4().makeRotationFromQuaternion(q)
  const flip = new Matrix4().makeScale(-1, 1, 1)
  m.premultiply(flip).multiply(flip)
  const e = new Euler().setFromRotationMatrix(m)
  return [e.x, e.y, e.z]
}

export const useEditor = create<EditorState>((set, get) => {
  const withItems = (fn: (items: Item[], doc: Bouquet) => Item[]) => get().commit((doc) => ({ ...doc, items: fn(doc.items, doc) }))
  const selectedSet = () => new Set(get().selected)
  const expandGroups = (ids: string[]) => {
    const items = get().doc.items
    const groups = new Set(items.filter((i) => ids.includes(i.id) && i.group).map((i) => i.group))
    return [...new Set([...ids, ...items.filter((i) => i.group && groups.has(i.group)).map((i) => i.id)])]
  }

  return {
    doc: initialDoc(),
    past: [],
    future: [],
    gesture: false,
    selected: [],
    clipboard: [],
    focus: null,
    camera: 'front',
    cameraNonce: 0,
    quality: prefs.quality ?? 'auto',
    muted: prefs.muted ?? false,
    shakeAt: 0,
    pokes: {},
    link: null,

    commit: (fn, mergeKey) =>
      set((s) => {
        const next = fn(s.doc)
        if (next === s.doc) return s
        const now = performance.now()
        const merging = !!mergeKey && mergeKey === lastMerge.key && now - lastMerge.at < 1200
        lastMerge.key = mergeKey ?? ''
        lastMerge.at = now
        if (s.gesture || merging) return { doc: next, future: [] }
        return { doc: next, past: [...s.past, s.doc].slice(-HISTORY_LIMIT), future: [] }
      }),
    beginGesture: () => set((s) => (s.gesture ? s : { gesture: true, past: [...s.past, s.doc].slice(-HISTORY_LIMIT), future: [] })),
    endGesture: () => set({ gesture: false }),
    undo: () =>
      set((s) => {
        if (!s.past.length) return s
        return { doc: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.doc, ...s.future] }
      }),
    redo: () =>
      set((s) => {
        if (!s.future.length) return s
        return { doc: s.future[0], past: [...s.past, s.doc], future: s.future.slice(1) }
      }),
    jump: (index) =>
      set((s) => {
        const timeline = [...s.past, s.doc, ...s.future]
        const i = Math.max(0, Math.min(timeline.length - 1, index))
        return { doc: timeline[i], past: timeline.slice(0, i), future: timeline.slice(i + 1) }
      }),
    load: (doc, link = null) => set({ doc, past: [], future: [], selected: [], link }),

    select: (id, additive = false) => {
      if (!id) return set({ selected: [] })
      const ids = expandGroups([id])
      if (!additive) return set({ selected: ids })
      const current = selectedSet()
      const removing = current.has(id)
      set({ selected: removing ? get().selected.filter((x) => !ids.includes(x)) : [...new Set([...get().selected, ...ids])] })
    },
    selectMany: (ids) => set({ selected: expandGroups(ids) }),

    addItem: (t, point) => {
      const { doc } = get()
      if (doc.items.length >= MAX_ITEMS) return null
      const info = SPECIES[t]
      const placement = point ? placeOnDome(point) : nextSlot(doc.items, doc.style, doc.seed)
      const item: Item = {
        id: newItemId(),
        t,
        stage: info.category === 'focal' ? 0.85 : 1,
        c: [...info.presets[0]],
        finish: t === 'plush' ? 'velvet' : 'natural',
        ...placement,
        s: 1,
        l: 1,
        leaves: info.category === 'focal' ? 2 : info.category === 'secondary' ? 1 : 0,
        group: null,
        locked: false,
        hidden: false,
      }
      withItems((items) => [...items, item])
      set({ selected: [item.id] })
      return item.id
    },
    updateItems: (ids, patch, mergeKey) => {
      const target = new Set(ids)
      get().commit((doc) => ({ ...doc, items: doc.items.map((i) => (target.has(i.id) ? BouquetSchema.shape.items.parse([{ ...i, ...patch(i) }])[0] ?? i : i)) }), mergeKey && `${mergeKey}:${ids.join()}`)
    },
    removeSelected: () => {
      const target = selectedSet()
      withItems((items) => items.filter((i) => !target.has(i.id) || i.locked))
      set({ selected: [] })
    },
    duplicateSelected: () => {
      const target = selectedSet()
      const { doc } = get()
      const room = MAX_ITEMS - doc.items.length
      const groupMap = new Map<string, string>()
      const copies = doc.items
        .filter((i) => target.has(i.id))
        .slice(0, room)
        .map((i) => ({
          ...i,
          id: newItemId(),
          locked: false,
          group: i.group ? (groupMap.get(i.group) ?? groupMap.set(i.group, newItemId()).get(i.group)!) : null,
          p: [i.p[0] + 0.12, i.p[1] + 0.04, i.p[2] + 0.08] as Item['p'],
        }))
      withItems((items) => [...items, ...copies])
      set({ selected: copies.map((c) => c.id) })
    },
    mirrorSelected: () => get().updateItems(get().selected, (i) => (i.locked ? {} : { p: [-i.p[0], i.p[1], i.p[2]], r: mirrorEuler(i.r) })),
    copy: () => set({ clipboard: get().doc.items.filter((i) => selectedSet().has(i.id)) }),
    paste: () => {
      const { clipboard, doc } = get()
      const copies = clipboard.slice(0, MAX_ITEMS - doc.items.length).map((i) => ({ ...i, id: newItemId(), group: null, locked: false, p: [i.p[0] + 0.15, i.p[1], i.p[2] + 0.1] as Item['p'] }))
      if (!copies.length) return
      withItems((items) => [...items, ...copies])
      set({ selected: copies.map((c) => c.id) })
    },
    group: () => {
      const id = newItemId()
      get().updateItems(get().selected, () => ({ group: id }))
    },
    ungroup: () => get().updateItems(get().selected, () => ({ group: null })),
    toggle: (key) => {
      const items = get().doc.items.filter((i) => selectedSet().has(i.id))
      const value = !items.every((i) => i[key])
      get().updateItems(get().selected, () => ({ [key]: value }))
    },
    nudge: (dx, dy, dz) => get().updateItems(get().selected, (i) => (i.locked ? {} : { p: [i.p[0] + dx, i.p[1] + dy, i.p[2] + dz] })),
    applyStyle: (style) => get().commit((doc) => ({ ...doc, style, items: arrange(doc.items, style, doc.seed) })),

    setCamera: (camera) => set((s) => ({ camera, cameraNonce: s.cameraNonce + 1, focus: null })),
    setQuality: (quality) => set({ quality }),
    setMuted: (muted) => set({ muted }),
    shake: () => set({ shakeAt: performance.now() }),
    poke: (id) => set((s) => ({ pokes: { ...s.pokes, [id]: performance.now() } })),
    setFocus: (focus) => set((s) => ({ focus, cameraNonce: s.cameraNonce + 1 })),
  }
})

let draftTimer: number | undefined
useEditor.subscribe((s, prev) => {
  if (s.doc !== prev.doc) {
    clearTimeout(draftTimer)
    draftTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(s.doc))
      } catch {}
    }, 400)
  }
  if (s.quality !== prev.quality || s.muted !== prev.muted) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ quality: s.quality, muted: s.muted }))
    } catch {}
  }
})

export const selectedItems = (s: EditorState) => s.doc.items.filter((i) => s.selected.includes(i.id))

export const vec = (v: Item['p']) => new Vector3(...v)
