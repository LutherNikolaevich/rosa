import { BoxGeometry, CylinderGeometry, Euler, LatheGeometry, Matrix4, SphereGeometry, Vector2, Vector3 } from 'three'
import type { Rng } from '@/src/state/random'
import type { SpeciesId } from '@/src/state/species'
import { Builder, at, grid, lerp, mix, orient, petal, petalPaint, petals, rgb, shade, smooth, type Rgb } from './geo'
import { LEAF, LEAF_LIGHT, STEM, YELLOW, blob, branchLeaves, curve, disk, leafAt, sepals, stamens, tinyFlower } from './parts'

export interface BuildInput {
  stage: number
  c0: Rgb
  c1: Rgb
  rng: Rng
}

type BuildFn = (b: Builder, x: BuildInput) => void

const ease = (s: number) => 1 - Math.pow(1 - s, 2)

const roseLike = (count: number, size: number, flatness: number, ruffle: number): BuildFn => (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  petals(
    b,
    {
      count,
      spiral: true,
      shape: (_i, t) => ({ len: size * lerp(0.42, 1, t) * (0.8 + 0.2 * s), width: size * lerp(0.55, 1.15, t), cup: lerp(1.2, 0.7, t), curl: lerp(-0.5, lerp(-0.3, 1.5 + flatness, t * t), s), ruffle: ruffle * t, base: 0.55, tip: 0.25 }),
      open: (t) => lerp(0.04 + 0.14 * t, 0.12 + (1.25 + flatness * 0.4) * Math.pow(t, 1.3), s),
      radius: (t) => 0.01 + 0.04 * t,
      height: (t) => -0.03 * t,
    },
    rng,
    (t) => petalPaint(shade(c0, lerp(0.82, 1, t)), c1, rng, { tipFrom: 0.55 }),
  )
  sepals(b, rng, 5, size * 0.4, lerp(0.6, 2.1, s))
}

const ringFlower = (rings: { count: number; len: number; width: number; tip?: number; base?: number; cup?: number; ruffle?: number; notch?: number; fringe?: number; curl?: [number, number]; open: [number, number]; radius?: number; height?: number }[]): BuildFn => (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  rings.forEach((ring, r) =>
    petals(
      b,
      {
        count: ring.count,
        phase: r * 0.6,
        shape: () => ({ len: ring.len * (0.75 + 0.25 * s), width: ring.width, tip: ring.tip, base: ring.base, cup: ring.cup, ruffle: ring.ruffle, notch: ring.notch, fringe: ring.fringe, curl: lerp(ring.curl?.[0] ?? -0.2, ring.curl?.[1] ?? 0.3, s) }),
        open: () => lerp(ring.open[0], ring.open[1], s),
        radius: () => ring.radius ?? 0.02,
        height: () => ring.height ?? 0,
        roll: 0.3,
      },
      rng,
      () => petalPaint(c0, c1, rng),
    ),
  )
}

const withCenter = (body: BuildFn, center: BuildFn): BuildFn => (b, x) => {
  body(b, x)
  center(b, x)
}

const daisyCenter = (radius: number, inner: Rgb, outer: Rgb, height = 0.5) => ((b, { rng, stage }) => disk(b, rng, radius * (0.8 + 0.2 * stage), radius * height, inner, outer, 0.005)) as BuildFn

const lathe = (profile: [number, number][], segments = 20) => new LatheGeometry(profile.map(([x, y]) => new Vector2(x, y)), segments)

const calla: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  const span = lerp(2.9, 2.2, s)
  b.add(
    grid(14, 14, (u, v) => {
      const radius = 0.025 + 0.13 * Math.pow(v, 1.5) + 0.06 * smooth(0.7, 1, v) * s
      const angle = u * span
      const tipLift = 0.18 * Math.pow(Math.max(0, Math.cos(angle * 0.5)), 6) * smooth(0.75, 1, v)
      return [Math.sin(angle) * radius, v * 0.42 + tipLift, Math.cos(angle) * radius - 0.03 * v]
    }),
    new Matrix4().makeRotationY(Math.PI),
    petalPaint(mix(c0, LEAF_LIGHT, 0.35), c0, rng, { tipFrom: -0.1, baseDark: 0.8 }),
  )
  b.add(new CylinderGeometry(0.012, 0.018, 0.26, 8), at(0, 0.14, 0), mix(YELLOW, c1, 0.3))
}

const tulip: BuildFn = ringFlower([
  { count: 3, len: 0.3, width: 0.26, tip: 0.22, base: 0.45, cup: 1.3, curl: [-0.35, 0.3], open: [0.1, 0.6] },
  { count: 3, len: 0.29, width: 0.25, tip: 0.22, base: 0.45, cup: 1.3, curl: [-0.4, 0.2], open: [0.04, 0.45] },
])

const lily: BuildFn = (b, x) => {
  ringFlower([{ count: 6, len: 0.38, width: 0.13, tip: 0.9, base: 0.5, cup: 0.5, ruffle: 0.12, curl: [-0.4, 1.9], open: [0.12, 1.25] }])(b, x)
  if (x.stage > 0.5) stamens(b, x.rng, 6, 0.26, 0.45, rgb('#c9d79b'), rgb('#a8461f'))
}

const orchid: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  const flowers = 3
  b.add(curve([[0, -0.1, 0], [0, 0.15, 0.05], [0, 0.32, 0.18], [0, 0.4, 0.38]], 0.006), new Matrix4(), STEM, 'green')
  for (let i = 0; i < flowers; i++) {
    const t = i / (flowers - 1)
    const bloom = Math.max(0, Math.min(1, s * 1.4 - t * 0.4))
    const size = lerp(0.3, 0.75, bloom)
    const m = at(0, lerp(0.05, 0.38, t), lerp(0.04, 0.36, t), size, size, size)
    if (bloom < 0.25) {
      b.add(new SphereGeometry(0.06, 8, 6), m.clone().multiply(at(0, 0, 0, 0.8, 1, 0.8)), mix(c0, LEAF_LIGHT, 0.4))
      continue
    }
    const face = new Matrix4().makeRotationX(-Math.PI / 2)
    ;[0, 2.1, 4.2].forEach((az) => b.add(petal({ len: 0.2, width: 0.11, tip: 0.5, base: 0.45, cup: -0.1, curl: 0.2 }, rng), m.clone().multiply(new Matrix4().makeRotationY(az)).multiply(face), petalPaint(c0, c0, rng, { baseDark: 0.9 })))
    ;[1.05, -1.05].forEach((az) => b.add(petal({ len: 0.22, width: 0.25, tip: 0.2, base: 0.3, cup: -0.15, curl: 0.15 }, rng), m.clone().multiply(new Matrix4().makeRotationY(Math.PI + az)).multiply(face), petalPaint(c0, mix(c0, c1, 0.15), rng, { baseDark: 0.95 })))
    b.add(petal({ len: 0.1, width: 0.09, tip: 0.3, base: 0.4, cup: 1.4, curl: -0.6 }, rng), m.clone().multiply(new Matrix4().makeRotationX(-1.1)), petalPaint(c1, mix(c1, YELLOW, 0.3), rng, { baseDark: 0.7 }))
  }
}

const sunflower: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  const r = 0.14
  ;[0, 1].forEach((ring) =>
    petals(b, { count: 21, phase: ring * 0.15, shape: () => ({ len: 0.19, width: 0.07, tip: 0.65, base: 0.45, cup: 0.35, ruffle: 0.1, curl: lerp(-0.6, 0.25, s) }), open: () => lerp(0.15, 1.42 - ring * 0.12, s), radius: () => r * 0.92, height: () => -0.01 * ring, roll: 0.3 }, rng, () => petalPaint(c0, c1, rng, { tipFrom: 0.3, baseDark: 0.75 })),
  )
  disk(b, rng, r, r * 0.35, rgb('#2b1a0d'), rgb('#6b3d12'), 0.004)
  sepals(b, rng, 12, 0.08, lerp(0.5, 1.9, s), r * 0.8)
}

const hydrangea: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  const count = 46
  const radius = lerp(0.12, 0.22, s)
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 1.1
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const az = i * 2.39996
    const dir = new Vector3(Math.cos(az) * ring, y, Math.sin(az) * ring)
    const color = mix(mix(c0, c1, rng()), LEAF_LIGHT, (1 - s) * 0.6)
    const m = orient(dir.clone().multiplyScalar(radius).add(new Vector3(0, radius * 0.4, 0)), dir, lerp(0.6, 1, s), rng() * 6)
    tinyFlower(b, rng, m, 4, 0.065, color, mix(color, [1, 1, 1], 0.15), mix(color, [1, 1, 1], 0.5), lerp(0.4, 1.35, s))
  }
  sepals(b, rng, 4, 0.08, 1.9)
}

const protea: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  ;[0, 1, 2].forEach((ring) =>
    petals(b, { count: 13, phase: ring * 0.24, shape: () => ({ len: 0.17 + ring * 0.07, width: 0.07 + ring * 0.015, tip: 0.85, base: 0.4, cup: 1.1, curl: lerp(-0.1, 0.25, s) }), open: () => lerp(0.06, 0.25 + ring * 0.18, s), radius: () => 0.05 + ring * 0.01, height: () => -ring * 0.04 }, rng, () => petalPaint(mix(c0, rgb('#d8cfb4'), 0.25), c0, rng, { tipFrom: 0.15, baseDark: 0.85 })),
  )
  b.add(new SphereGeometry(0.075, 14, 10), at(0, 0.06, 0, 1, lerp(1.4, 1.1, s), 1), (u, v) => shade(mix(c1, rgb('#fffaf0'), v), 0.9 + 0.1 * Math.sin(u * 140)))
}

const dahlia: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  petals(b, { count: 64, spiral: true, shape: (_i, t) => ({ len: lerp(0.06, 0.2, t), width: lerp(0.06, 0.11, t), cup: lerp(2, 1.4, t), tip: 0.75, base: 0.45, curl: lerp(-0.2, 0.15, s) }), open: (t) => lerp(0.05 + 0.2 * t, 0.1 + 1.55 * Math.pow(t, 0.9), s), radius: (t) => 0.01 + 0.03 * t, height: (t) => 0.03 - 0.05 * t }, rng, (t) => petalPaint(shade(c0, lerp(0.85, 1, t)), c1, rng, { tipFrom: 0.4 }))
  sepals(b, rng, 8, 0.07, lerp(0.8, 2.1, s))
}

const anemone: BuildFn = withCenter(
  ringFlower([{ count: 6, len: 0.2, width: 0.2, tip: 0.2, base: 0.35, cup: 0.5, ruffle: 0.08, curl: [-0.4, 0.1], open: [0.25, 1.3] }]),
  (b, { rng, stage }) => {
    disk(b, rng, 0.05, 0.04, rgb('#13142e'), rgb('#26285a'), 0.005)
    if (stage > 0.4) stamens(b, rng, 22, 0.05, 2.4, rgb('#1c1d3a'), rgb('#0e0f22'))
  },
)

const lotus: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  ;[0, 1, 2].forEach((ring) =>
    petals(b, { count: 6 + ring * 2, phase: ring * 0.4, shape: () => ({ len: 0.2 + ring * 0.04, width: 0.13 + ring * 0.015, tip: 0.75, base: 0.45, cup: 1.4, curl: lerp(-0.25, 0.2, s) }), open: () => lerp(0.05 + ring * 0.05, 0.3 + ring * 0.42, s), radius: () => 0.03 + ring * 0.01, height: () => -ring * 0.015 }, rng, () => petalPaint(c0, c1, rng, { tipFrom: 0.35, baseDark: 0.9 })),
  )
  b.add(new CylinderGeometry(0.05, 0.035, 0.05, 14), at(0, 0.04, 0), rgb('#d9c64a'))
  stamens(b, rng, 18, 0.05, 1.6, rgb('#f4d35e'), rgb('#e5a820'), 0.02)
}

const gumamela: BuildFn = (b, x) => {
  ringFlower([{ count: 5, len: 0.28, width: 0.3, tip: 0.15, base: 0.3, cup: 0.4, ruffle: 0.25, curl: [-0.5, 0.35], open: [0.15, 1.2] }])(b, x)
  const s = ease(x.stage)
  const len = lerp(0.1, 0.34, s)
  b.add(new CylinderGeometry(0.006, 0.009, len, 6), orient(new Vector3(0, 0, 0), new Vector3(0, 1, 0.25)).multiply(at(0, len / 2, 0)), shade(x.c0, 0.85))
  for (let i = 0; i < 12; i++) blob(b, Math.sin(i) * 0.02, len * 0.97 + (i % 3) * 0.012, len * 0.24 + Math.cos(i) * 0.02, 0.009, YELLOW)
}

const sampaguita: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  const spots: [number, number, number][] = [[0, 0.03, 0], [0.12, -0.02, 0.05], [-0.1, -0.03, -0.06]]
  spots.forEach(([x, y, z], i) => {
    const local = i === 0 ? s : Math.max(0, s - 0.3)
    const matrix = orient(new Vector3(x, y, z), new Vector3(x * 2, 1, z * 2))
    if (local < 0.2) b.add(new SphereGeometry(0.035, 8, 6), matrix.clone().multiply(at(0, 0.03, 0, 0.7, 1.4, 0.7)), mix(c0, LEAF_LIGHT, 0.2))
    else petals(b, { count: 9, matrix, shape: () => ({ len: 0.085, width: 0.045, tip: 0.4, base: 0.4, cup: 0.4, curl: 0.3 }), open: () => lerp(0.3, 1.4, local), radius: () => 0.008, roll: 0.3 }, rng, () => petalPaint(c0, c1, rng, { baseDark: 0.92 }))
  })
  leafAt(b, rng, at(0, -0.05, 0, 1, 1, 1, new Euler(1.1, 0.4, 0)), { len: 0.16, width: 0.08 })
}

const carnation: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  petals(b, { count: 34, spiral: true, shape: (_i, t) => ({ len: lerp(0.09, 0.15, t), width: lerp(0.11, 0.15, t), cup: 0.4, ruffle: 0.8, fringe: 1.2, tip: 0.12, base: 0.5, curl: lerp(-0.3, 0.6, s * t) }), open: (t) => lerp(0.05 + 0.1 * t, 0.25 + 1.2 * t, s), radius: (t) => 0.01 + 0.02 * t, height: (t) => 0.06 - 0.03 * t }, rng, () => petalPaint(c0, c1, rng, { tipFrom: 0.6, baseDark: 0.8 }))
  b.add(new CylinderGeometry(0.035, 0.022, 0.09, 10), at(0, 0.0, 0), LEAF, 'green')
}

const daisy: BuildFn = withCenter(ringFlower([{ count: 22, len: 0.16, width: 0.035, tip: 0.3, base: 0.5, cup: 0.3, curl: [-0.8, 0.15], open: [0.2, 1.45], radius: 0.04 }]), daisyCenter(0.05, rgb('#e09a12'), rgb('#f7cd3a'), 0.7))

const gerbera: BuildFn = (b, x) => {
  ringFlower([
    { count: 22, len: 0.19, width: 0.045, tip: 0.35, base: 0.55, cup: 0.25, curl: [-0.8, 0.1], open: [0.2, 1.48], radius: 0.06 },
    { count: 22, len: 0.15, width: 0.04, tip: 0.35, base: 0.55, cup: 0.25, curl: [-0.8, 0.05], open: [0.15, 1.38], radius: 0.055, height: 0.005 },
  ])(b, x)
  daisyCenter(0.06, rgb('#2a1a0c'), mix(x.c0, rgb('#5b7a2a'), 0.5), 0.35)(b, x)
  sepals(b, x.rng, 14, 0.06, lerp(0.6, 1.9, x.stage), 0.05)
}

const lavender: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  b.add(new CylinderGeometry(0.004, 0.006, 0.5, 5), at(0, 0.2, 0), STEM, 'green')
  for (let w = 0; w < 20; w++) {
    const t = w / 19
    const y = 0.02 + t * 0.45
    const size = lerp(1, 0.55, t) * lerp(0.7, 1, s)
    for (let k = 0; k < 4; k++) {
      const az = k * 1.57 + w * 0.6
      const r = 0.018 * size
      const color = mix(mix(c0, c1, rng() * 0.6), rgb('#9aa79a'), (1 - s) * 0.4)
      b.add(new SphereGeometry(0.014 * size, 5, 4), at(Math.sin(az) * r, y, Math.cos(az) * r, 1, 1.5, 1), color)
    }
  }
}

const lisianthus: BuildFn = (b, x) => roseLike(12, 0.25, 0.2, 0.45)(b, { ...x, c1: mix(x.c1, x.c0, 0.1) })

const freesia: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  const pts: [number, number, number][] = [[0, -0.05, 0], [0, 0.1, 0.03], [0, 0.18, 0.15], [0, 0.17, 0.33]]
  b.add(curve(pts, 0.006), new Matrix4(), STEM, 'green')
  for (let i = 0; i < 6; i++) {
    const t = i / 5
    const bloom = Math.max(0, Math.min(1, s * 1.5 - t))
    const pos = new Vector3(0, lerp(0.13, 0.19, t), lerp(0.05, 0.33, t))
    const m = orient(pos, new Vector3(0, 1, 0.4), lerp(0.45, 1, bloom))
    if (bloom < 0.2) b.add(new SphereGeometry(0.025, 7, 5), m.clone().multiply(at(0, 0.02, 0, 0.7, 1.4, 0.7)), mix(c0, LEAF_LIGHT, 0.5))
    else
      b.add(lathe([[0.004, 0], [0.012, 0.03], [0.025, 0.07], [0.04, 0.09]], 12), m, (u, v) => shade(mix(c1, c0, v), 0.8 + 0.2 * v))
    if (bloom >= 0.2) petals(b, { count: 6, matrix: m, shape: () => ({ len: 0.05, width: 0.05, tip: 0.2, base: 0.4, cup: 0.4, curl: 0.4 }), open: () => lerp(0.4, 1.2, bloom), radius: () => 0.03, height: () => 0.08 }, rng, () => petalPaint(c0, c1, rng, { baseDark: 0.9 }))
  }
}

const cosmos: BuildFn = withCenter(ringFlower([{ count: 8, len: 0.22, width: 0.13, tip: 0.05, base: 0.45, cup: 0.25, notch: 0.15, fringe: 0.6, curl: [-0.6, 0.1], open: [0.25, 1.4], radius: 0.03 }]), daisyCenter(0.04, rgb('#d48a0c'), rgb('#f7c93a'), 0.6))

const forgetMeNot: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  for (let i = 0; i < 13; i++) {
    const az = i * 2.39996
    const r = Math.sqrt(i / 13) * 0.11
    const pos = new Vector3(Math.cos(az) * r, 0.04 - r * 0.4, Math.sin(az) * r)
    const m = orient(pos, new Vector3(pos.x * 3, 1, pos.z * 3), lerp(0.5, 1, s))
    tinyFlower(b, rng, m, 5, 0.032, c0, c1, YELLOW, lerp(0.5, 1.4, s))
    b.add(curve([[0, -0.08, 0], [pos.x * 0.5, -0.02, pos.z * 0.5], [pos.x, pos.y, pos.z]], 0.003, 4), new Matrix4(), STEM, 'green')
  }
}

const babysBreath: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  for (let br = 0; br < 9; br++) {
    const az = br * 2.39996
    const tip = new Vector3(Math.cos(az) * 0.2 * (0.4 + rng()), 0.12 + rng() * 0.2, Math.sin(az) * 0.2 * (0.4 + rng()))
    b.add(curve([[0, -0.1, 0], [tip.x * 0.4, tip.y * 0.5, tip.z * 0.4], [tip.x, tip.y, tip.z]], 0.003, 6), new Matrix4(), STEM, 'green')
    for (let k = 0; k < 8; k++) {
      const p = tip.clone().add(new Vector3((rng() - 0.5) * 0.09, (rng() - 0.3) * 0.06, (rng() - 0.5) * 0.09))
      blob(b, p.x, p.y, p.z, 0.016 * lerp(0.6, 1, s), mix(mix(c0, c1, rng()), LEAF_LIGHT, (1 - s) * 0.5), 'petal', 1)
    }
  }
}

const eucalyptus: BuildFn = (b, { c0, c1, rng }) => branchLeaves(b, rng, 0.55, 8, (t) => ({ len: lerp(0.11, 0.07, t), width: lerp(0.11, 0.07, t), tip: 0.3, base: 0.3, fold: 0.05, cup: 0.1 }), { c0, c1, angle: 1.2 })
const fern: BuildFn = (b, { c0, c1, rng }) => branchLeaves(b, rng, 0.7, 16, (t) => ({ len: lerp(0.16, 0.04, t), width: 0.035, tip: 0.8, base: 0.3, fringe: 0.8, curl: 0.3 }), { c0, c1, angle: 1.35, bend: 0.3 })
const ruscus: BuildFn = (b, { c0, c1, rng }) => branchLeaves(b, rng, 0.6, 11, (t) => ({ len: lerp(0.12, 0.08, t), width: 0.055, tip: 0.85, base: 0.35 }), { c0, c1, angle: 0.8, alternate: true })
const olive: BuildFn = (b, { c0, c1, rng }) => {
  branchLeaves(b, rng, 0.6, 9, () => ({ len: 0.13, width: 0.025, tip: 0.9, base: 0.4, curl: 0.2 }), { c0, c1, angle: 0.7 })
  for (let i = 0; i < 4; i++) b.add(new SphereGeometry(0.02, 8, 6), at(0.03 * (i % 2 ? 1 : -1), 0.15 + i * 0.1, 0.02, 1, 1.3, 1), rgb('#3e3a2a'), 'green')
}

const pampas: BuildFn = (b, { c0, c1, rng }) => {
  b.add(new CylinderGeometry(0.004, 0.006, 0.7, 5), at(0, 0.25, 0), shade(c0, 0.75), 'green')
  for (let i = 0; i < 90; i++) {
    const t = i / 89
    const az = i * 2.39996
    const y = lerp(0.1, 0.6, t)
    const m = new Matrix4().makeTranslation(0, y, 0).multiply(new Matrix4().makeRotationY(az)).multiply(new Matrix4().makeRotationX(-lerp(0.5, 0.15, t)))
    b.add(petal({ len: lerp(0.15, 0.09, t), width: 0.035, tip: 0.9, base: 0.3, ruffle: 0.6, curl: 0.5, nu: 2, nv: 5 }, rng), m, petalPaint(c0, c1, rng, { baseDark: 0.85, tipFrom: 0.2 }))
  }
}

const waxFlower: BuildFn = (b, { stage, c0, c1, rng }) => {
  const s = ease(stage)
  branchLeaves(b, rng, 0.45, 10, () => ({ len: 0.05, width: 0.008, tip: 0.9, base: 0.3, nu: 2, nv: 4 }), { angle: 0.6 })
  for (let i = 0; i < 14; i++) {
    const az = i * 2.39996
    const pos = new Vector3(Math.cos(az) * 0.09, 0.15 + (i / 14) * 0.3, Math.sin(az) * 0.09)
    const m = orient(pos, new Vector3(Math.cos(az), 0.8, Math.sin(az)), lerp(0.5, 1, s))
    tinyFlower(b, rng, m, 5, 0.035, c0, c1, rgb('#7a2442'), lerp(0.4, 1.3, s))
  }
}

const monstera: BuildFn = (b, { c0, c1, rng }) => {
  const seed = rng() * 10
  const holes = (u: number, v: number) => {
    const slit = Math.abs(u) > 0.45 && Math.sin(v * 26 + seed) > 0.55 && v > 0.15 && v < 0.9
    const hole = Math.abs(Math.abs(u) - 0.3) < 0.07 && Math.sin(v * 18 + 1.3 + seed) > 0.8
    return slit || hole
  }
  b.add(new CylinderGeometry(0.006, 0.008, 0.35, 5), at(0, -0.1, 0), STEM, 'green')
  leafAt(b, rng, new Matrix4().makeTranslation(0, 0.05, 0).multiply(new Matrix4().makeRotationX(-0.7)), { len: 0.46, width: 0.42, tip: 0.35, base: 0.25, cup: 0.25, fold: 0.1, curl: 0.5, nu: 24, nv: 22, holes }, c0, c1)
}

const chocolate: BuildFn = (b, { c0, c1, rng }) => {
  const r = 0.075
  const crinkle = rng() * 10
  const sphere = new SphereGeometry(r, 18, 14)
  const pos = sphere.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const n = 1 + 0.06 * Math.sin(pos.getX(i) * 210 + crinkle) * Math.cos(pos.getY(i) * 190 + pos.getZ(i) * 170)
    pos.setXYZ(i, pos.getX(i) * n, pos.getY(i) * n, pos.getZ(i) * n)
  }
  sphere.computeVertexNormals()
  b.add(sphere, at(0, r * 0.9, 0), c0, 'metal')
  b.add(lathe([[0.03, -0.01], [0.06, 0.0], [0.085, 0.05], [0.095, 0.065]], 24), new Matrix4(), (u) => shade(c1, 0.85 + 0.15 * Math.sin(u * 150)), 'green')
}

const fairyLights: BuildFn = (b, { c0, c1, rng }) => {
  const pts: [number, number, number][] = []
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    pts.push([Math.cos(t * 14) * lerp(0.15, 0.55, t), lerp(-0.3, 0.45, Math.sin(t * Math.PI)), Math.sin(t * 14) * lerp(0.15, 0.55, t)])
  }
  b.add(curve(pts, 0.003, 120), new Matrix4(), c1, 'green')
  for (let i = 1; i < 40; i += 2) {
    const [x, y, z] = pts[i]
    blob(b, x, y, z, 0.014, shade(c0, 0.9 + rng() * 0.2), 'glow', 1)
  }
}

const butterfly: BuildFn = (b, { c0, c1, rng }) => {
  const paint = (u: number, v: number): Rgb => (v > 0.82 || Math.abs(u) > 0.85 ? c1 : mix(c0, [1, 1, 1], Math.max(0, 0.25 - v * 0.3)))
  for (const side of [1, -1] as const) {
    const kind = side > 0 ? 'wingR' : 'wingL'
    b.add(petal({ len: 0.2, width: 0.23, tip: 0.2, base: 0.25, cup: 0.05, nu: 6, nv: 6 }, rng), new Matrix4().makeRotationZ(-side * 1.2), paint, kind)
    b.add(petal({ len: 0.15, width: 0.16, tip: 0.3, base: 0.3, cup: 0.05, nu: 6, nv: 6 }, rng), new Matrix4().makeRotationZ(-side * 2.3), paint, kind)
  }
  b.add(new CylinderGeometry(0.012, 0.008, 0.18, 6), new Matrix4(), c1, 'green')
}

const plush: BuildFn = (b, { c0, c1 }) => {
  const ball = (x: number, y: number, z: number, r: number, color: Rgb, sy = 1) => b.add(new SphereGeometry(r, 16, 12), at(x, y, z, 1, sy, 1), color)
  ball(0, 0.1, 0, 0.1, c0, 1.1)
  ball(0, 0.25, 0, 0.085, c0)
  ball(-0.065, 0.32, 0, 0.03, c0)
  ball(0.065, 0.32, 0, 0.03, c0)
  ball(0, 0.235, 0.07, 0.035, c1, 0.8)
  ball(0, 0.1, 0.075, 0.055, c1)
  ball(-0.085, 0.13, 0.04, 0.035, c0, 1.3)
  ball(0.085, 0.13, 0.04, 0.035, c0, 1.3)
  ball(-0.05, 0.01, 0.06, 0.04, c0)
  ball(0.05, 0.01, 0.06, 0.04, c0)
  ;[-0.03, 0.03].forEach((x) => b.add(new SphereGeometry(0.01, 6, 5), at(x, 0.27, 0.075), rgb('#1b1212'), 'metal'))
  b.add(new SphereGeometry(0.011, 6, 5), at(0, 0.25, 0.102), rgb('#1b1212'), 'metal')
}

const polaroid: BuildFn = (b, { c0, c1 }) => {
  b.add(new BoxGeometry(0.24, 0.28, 0.008), at(0, 0.15, 0), c0)
  b.add(new CylinderGeometry(0.004, 0.004, 0.2, 5), at(0, -0.06, -0.006), c1, 'green')
}

const cotton: BuildFn = (b, { c0, c1, rng }) => {
  b.add(curve([[0, -0.1, 0], [0.02, 0.1, 0], [-0.08, 0.3, 0.02]], 0.006), new Matrix4(), c1, 'green')
  const bolls: [number, number, number][] = [[0.02, 0.12, 0.02], [-0.08, 0.31, 0.02], [0.1, 0.24, -0.03]]
  bolls.forEach(([x, y, z]) => {
    petals(b, { count: 5, matrix: at(x, y, z), shape: () => ({ len: 0.065, width: 0.045, tip: 0.9, base: 0.4, cup: -0.2, curl: 0.8, nu: 3, nv: 4 }), open: () => 1.6, radius: () => 0.01 }, rng, () => petalPaint(c1, shade(c1, 0.7), rng, { baseDark: 0.9 }), 'green')
    for (let i = 0; i < 5; i++) {
      const az = (i / 5) * Math.PI * 2
      blob(b, x + Math.sin(az) * 0.035, y + 0.035, z + Math.cos(az) * 0.035, 0.036, shade(c0, 0.95 + rng() * 0.05), 'petal', 2)
    }
  })
}

const dried: BuildFn = (b, { c0, c1, rng }) => {
  for (let i = 0; i < 7; i++) {
    const az = i * 2.39996
    const tip: [number, number, number] = [Math.cos(az) * 0.12, 0.25 + rng() * 0.25, Math.sin(az) * 0.12]
    b.add(curve([[0, -0.1, 0], [tip[0] * 0.3, tip[1] * 0.5, tip[2] * 0.3], tip], 0.003, 6), new Matrix4(), shade(c1, 0.6), 'green')
    b.add(new SphereGeometry(0.035, 10, 8), at(tip[0], tip[1] + 0.03, tip[2], 0.8, 1.6, 0.8), (u, v) => shade(mix(c0, c1, v), 0.85 + 0.15 * Math.sin(u * 90 + v * 40)))
  }
}

export const BUILDERS: Record<SpeciesId, BuildFn> = {
  rose: roseLike(26, 0.26, 0, 0.05),
  'garden-rose': roseLike(46, 0.24, 0.35, 0.15),
  peony: roseLike(52, 0.27, 0.15, 0.55),
  ranunculus: roseLike(72, 0.17, 0, 0),
  tulip,
  lily,
  orchid,
  sunflower,
  hydrangea,
  protea,
  dahlia,
  anemone,
  calla,
  lotus,
  gumamela,
  sampaguita,
  carnation,
  daisy,
  gerbera,
  lavender,
  lisianthus,
  freesia,
  cosmos,
  'forget-me-not': forgetMeNot,
  'babys-breath': babysBreath,
  eucalyptus,
  fern,
  ruscus,
  pampas,
  'wax-flower': waxFlower,
  monstera,
  olive,
  chocolate,
  'fairy-lights': fairyLights,
  butterfly,
  plush,
  polaroid,
  cotton,
  dried,
}

export const NO_STEM = new Set<SpeciesId>(['butterfly', 'fairy-lights'])
