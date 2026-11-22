import { useId, type ReactNode } from 'react'
import { SPECIES, type SpeciesId } from '@/src/state/species'

const STEM = '#4f7a3c'
const LEAF = '#6f9a4e'
const INK = '#3a2618'

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('')}`
}

const ink = (fill: string, k = 0.3) => ({ fill, stroke: shade(fill, -k), strokeWidth: 0.6, strokeLinejoin: 'round' as const })

const round = (len: number, w: number) => `M0 0C${-w} ${-len * 0.35} ${-w} ${-len} 0 ${-len}C${w} ${-len} ${w} ${-len * 0.35} 0 0Z`
const pointed = (len: number, w: number) => `M0 0C${-w} ${-len * 0.4} ${-w * 0.6} ${-len * 0.8} 0 ${-len}C${w * 0.6} ${-len * 0.8} ${w} ${-len * 0.4} 0 0Z`
const notched = (len: number, w: number) => `M0 0C${-w} ${-len * 0.35} ${-w} ${-len} ${-w * 0.45} ${-len}L0 ${-len * 0.86}L${w * 0.45} ${-len}C${w} ${-len} ${w} ${-len * 0.35} 0 0Z`

const around = (n: number, turn = 0) => Array.from({ length: n }, (_, i) => turn + (360 / n) * i)
const polar = (r: number, deg: number, x = 20, y = 20): [number, number] => [x + r * Math.sin((deg * Math.PI) / 180), y - r * Math.cos((deg * Math.PI) / 180)]

function spiral(r: number, turns: number) {
  const steps = Math.round(turns * 24)
  return Array.from({ length: steps + 1 }, (_, i) => {
    const [x, y] = polar((r * i) / steps, (360 * turns * i) / steps)
    return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
  }).join('')
}

function frill(cx: number, cy: number, r: number, inner: number, n: number) {
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = Math.PI + (Math.PI * i) / n
    const rr = i % 2 ? inner : r
    return `${i ? 'L' : 'M'}${(cx + rr * Math.cos(t)).toFixed(2)} ${(cy + rr * Math.sin(t)).toFixed(2)}`
  })
  return `${pts.join('')}Q${cx} ${cy + r * 0.35} ${cx - r} ${cy}Z`
}

function Petals({ d, at, fill, alt = fill, x = 20, y = 20, edge = 0.3 }: { d: string; at: number[]; fill: string; alt?: string; x?: number; y?: number; edge?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {at.map((deg, i) => (
        <path key={i} d={d} transform={`rotate(${deg})`} {...ink(i % 2 ? alt : fill, edge)} />
      ))}
    </g>
  )
}

function Stem({ d, color = STEM, w = 1.8 }: { d: string; color?: string; w?: number }) {
  return <path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
}

const HYDRANGEA_FLORETS = [[20, 20] as [number, number], ...around(6, 30).map((deg) => polar(7.2, deg)), ...around(6).map((deg) => polar(12.5, deg))]
const FORGET_ME_NOT = [[13, 13, 1], [27, 12, 0.9], [19, 25, 1.05], [30, 26, 0.85], [9, 28, 0.8]]
const BABYS_BREATH_TIPS = [[9, 10], [15, 9], [19, 9], [31, 8], [25, 7], [12, 16], [28, 13]]
const CLUSTER = [[0, 0], [2.4, -1.2], [-2.3, -1], [0, -2.6]]
const EUCALYPTUS = [[14.5, 30, 5], [25.5, 24, 4.6], [14.8, 18, 4.2], [25, 12.5, 3.7], [16.5, 7, 3.2]]
const FERN = Array.from({ length: 9 }, (_, k) => {
  const t = 0.12 + k * 0.1
  const x = (1 - t) ** 2 * 20 + 2 * (1 - t) * t * 22 + t * t * 18
  const y = (1 - t) ** 2 * 37 + 2 * (1 - t) * t * 20 + t * t * 4
  return [x, y, 10 * (1 - t) + 2.5]
})
const RUSCUS = [[20.2, 31, -48, 10], [20, 25, 52, 9.5], [20.2, 19, -48, 8.5], [20.6, 13, 50, 7.5], [21, 7.5, -40, 6], [21, 5, 5, 5]]
const WAX_FLOWERS = [[12, 16, 1], [20, 10, 1.1], [28, 13, 1], [15, 9, 0.75], [25.5, 7, 0.7]]
const OLIVE_LEAVES = [[9.9, 32.3, -5], [13.1, 28.3, 95], [16.7, 24, -5], [20.7, 19.4, 95], [25, 14.6, -5], [29.1, 10.2, 95], [33, 6, 40]]
const FAIRY_BULBS = [[7.4, 14.1, 10], [14.6, 14.9, -8], [25.4, 14.9, 8], [32.6, 14.1, -10]]
const BUTTERFLY_WING = 'M19.5 19C15 9 7 5 4 9C1.5 13 6 20 19.5 21ZM19.5 21C12 21.5 6.5 26 8.5 31C10.5 35 17 30 19.5 23Z'

type Draw = (a: string, b: string, uid: string) => ReactNode

const GLYPHS: Record<SpeciesId, Draw> = {
  rose: (a) => (
    <>
      <Petals d={round(16, 10)} at={around(5)} fill={a} />
      <Petals d={round(12, 8)} at={around(5, 36)} fill={shade(a, 0.12)} />
      <circle cx="20" cy="20" r="7.5" fill={shade(a, -0.05)} />
      <path d={spiral(7, 2.2)} fill="none" stroke={shade(a, -0.4)} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'garden-rose': (a, b) => (
    <>
      <Petals d={round(16, 7.5)} at={around(8)} fill={b} alt={shade(b, -0.06)} />
      <Petals d={round(12.5, 6.5)} at={around(8, 22.5)} fill={a} />
      <Petals d={round(8.5, 5)} at={around(6, 10)} fill={shade(a, 0.15)} />
      <circle cx="20" cy="20" r="2.6" fill={shade(a, -0.2)} />
    </>
  ),
  peony: (a, b) => (
    <>
      {around(9).map((deg) => {
        const [x, y] = polar(10, deg)
        return <circle key={deg} cx={x} cy={y} r="6.5" {...ink(b, 0.22)} />
      })}
      {around(7, 25).map((deg) => {
        const [x, y] = polar(6, deg)
        return <circle key={deg} cx={x} cy={y} r="5" {...ink(a, 0.22)} />
      })}
      {around(4, 45).map((deg) => {
        const [x, y] = polar(2.4, deg)
        return <circle key={deg} cx={x} cy={y} r="3.4" {...ink(shade(a, -0.08), 0.22)} />
      })}
    </>
  ),
  ranunculus: (a, b) => (
    <>
      <Petals d={round(15.5, 5.5)} at={around(11)} fill={a} alt={shade(a, -0.05)} edge={0.25} />
      <Petals d={round(12, 5)} at={around(10, 14)} y={19.5} fill={b} alt={shade(b, -0.05)} edge={0.25} />
      <Petals d={round(8.5, 4.2)} at={around(8, 6)} y={19} fill={a} edge={0.25} />
      <Petals d={round(5.5, 3.2)} at={around(6, 25)} y={18.6} fill={b} edge={0.25} />
      <circle cx="20" cy="18.4" r="2.4" fill="#7d9a45" />
    </>
  ),
  tulip: (a, b) => (
    <>
      <Stem d="M20 38V24" />
      <path d="M20 36C13 33 10 26 11 18C15 22 18.5 28 20 36Z" {...ink(LEAF)} />
      <path d="M12 9C11.5 19 14.5 25 20 25C25.5 25 28.5 19 28 9L24 13.5L20 6L16 13.5Z" {...ink(a)} />
      <path d="M20 25C16.5 24.5 15 19 16.2 12Q20 14.5 23.8 12C25 19 23.5 24.5 20 25Z" {...ink(b, 0.25)} />
    </>
  ),
  lily: (a, b) => (
    <>
      <Petals d={pointed(17, 7)} at={around(6)} fill={a} alt={shade(a, -0.05)} />
      <g transform="translate(20 20)">
        {around(6).map((deg) => (
          <path key={deg} d="M0 -3V-12" transform={`rotate(${deg})`} stroke={b} strokeWidth="1.1" strokeLinecap="round" />
        ))}
        {around(6, 30).map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <path d="M0 0V-8" stroke="#c9d67a" strokeWidth="0.7" />
            <ellipse cy="-8.6" rx="0.9" ry="1.6" fill="#a8442a" />
          </g>
        ))}
      </g>
    </>
  ),
  orchid: (a, b) => (
    <>
      <Petals d={pointed(15, 6)} at={[0, 125, 235]} fill={a} />
      <Petals d={round(13, 11)} at={[-68, 68]} fill={shade(a, 0.05)} />
      <Petals d={round(9, 6)} at={[180]} fill={b} />
      <circle cx="20" cy="19" r="2.2" {...ink('#fff3c4')} />
    </>
  ),
  sunflower: (a, b) => (
    <>
      <Petals d={pointed(18, 4)} at={around(16)} fill={a} />
      <Petals d={pointed(14, 3.6)} at={around(16, 11.25)} fill={b} />
      <circle cx="20" cy="20" r="8" fill="#5b3a1a" stroke="#3d2511" strokeWidth="0.8" />
      <circle cx="20" cy="20" r="5" fill="#3d2511" />
      {around(12).map((deg) => {
        const [x, y] = polar(6.5, deg)
        return <circle key={deg} cx={x} cy={y} r="0.8" fill="#8a6030" />
      })}
    </>
  ),
  hydrangea: (a, b) => (
    <>
      <circle cx="20" cy="20" r="14" fill={shade(a, -0.2)} />
      {HYDRANGEA_FLORETS.map(([x, y], i) => (
        <g key={i}>
          <Petals d={round(4.2, 2.8)} at={around(4, i * 20)} x={x} y={y} fill={i % 2 ? b : a} edge={0.2} />
          <circle cx={x} cy={y} r="0.8" fill={shade(a, -0.35)} />
        </g>
      ))}
    </>
  ),
  protea: (a, b) => (
    <>
      <Stem d="M20 38V31" />
      <Petals d={pointed(16, 3.8)} at={[-78, -58, -38, 38, 58, 78]} y={31} fill={shade(a, -0.12)} alt={shade(a, -0.04)} />
      <path d="M12 30C11 20 14 9 20 8C26 9 29 20 28 30Z" {...ink(b, 0.25)} />
      <path d="M15 14Q20 11 25 14M13.5 19Q20 15.5 26.5 19M13 24Q20 20.5 27 24" stroke={shade(b, -0.2)} strokeWidth="0.7" strokeDasharray="1 1" fill="none" />
      <Petals d={pointed(9, 4.2)} at={[-30, -10, 10, 30]} y={32} fill={a} alt={shade(a, 0.08)} />
    </>
  ),
  dahlia: (a, b) => (
    <>
      <Petals d={pointed(17, 5)} at={around(12)} fill={a} />
      <Petals d={pointed(13, 4.4)} at={around(12, 15)} fill={shade(a, 0.08)} />
      <Petals d={pointed(9, 3.6)} at={around(10, 7)} fill={b} />
      <circle cx="20" cy="20" r="3" fill={shade(b, -0.15)} />
    </>
  ),
  anemone: (a) => (
    <>
      <Petals d={round(15, 9)} at={around(6, 30)} fill={a} alt={shade(a, -0.06)} />
      {around(14).map((deg) => {
        const [x, y] = polar(7.2, deg)
        return <circle key={deg} cx={x} cy={y} r="0.9" fill="#262a4a" />
      })}
      <circle cx="20" cy="20" r="5" fill="#1d2140" />
    </>
  ),
  calla: (a, b) => (
    <>
      <Stem d="M20 38V27" w={2.2} />
      <path d="M20 30C14.5 26 11 18 11.5 10C16 12 24 9 30.5 5C29 15 25.5 25 20 30Z" {...ink(a)} />
      <path d="M13 11C17.5 12 24.5 9.5 29.5 6C24 10 18.5 14 16 20C14 17 13 14 13 11Z" fill={b} />
      <path d="M17.5 20L22 10.5" stroke="#f2c230" strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  lotus: (a, b) => (
    <>
      <ellipse cx="20" cy="33" rx="14" ry="3.2" {...ink(LEAF)} />
      <Petals d={pointed(14, 6.5)} at={[-62, 62]} y={31} fill={b} />
      <Petals d={pointed(18, 6.5)} at={[-30, 30]} y={31} fill={shade(a, -0.04)} edge={0.4} />
      <Petals d={pointed(21, 7)} at={[0]} y={31} fill={a} edge={0.4} />
    </>
  ),
  gumamela: (a, b) => (
    <>
      <Petals d={round(16, 11)} at={around(5, 10)} fill={a} alt={shade(a, -0.05)} />
      <g transform="translate(20 20)">
        {around(5, 10).map((deg) => (
          <path key={deg} d="M0 -3V-11" transform={`rotate(${deg})`} stroke={shade(a, -0.3)} strokeWidth="0.6" />
        ))}
      </g>
      <circle cx="20" cy="20" r="3.6" fill={shade(a, -0.4)} />
      <path d="M20 20L29.5 9" stroke={b} strokeWidth="1.6" strokeLinecap="round" />
      {[[29.5, 8.4], [28, 10.5], [31, 10.6]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="1" fill="#ffd84a" />
      ))}
    </>
  ),
  sampaguita: (a, b) => (
    <>
      <path d="M30 34Q26 24 33 18Q36 28 30 34Z" {...ink(LEAF)} />
      <Petals d={round(12, 5.5)} at={around(8)} x={18} y={19} fill={a} alt={b} edge={0.22} />
      <circle cx="18" cy="19" r="2" fill="#efe6a8" />
      <ellipse cx="32" cy="8" rx="2.6" ry="4.6" transform="rotate(35 32 8)" {...ink(b, 0.22)} />
    </>
  ),
  carnation: (a, b) => (
    <>
      <Stem d="M20 38V30" />
      <path d="M17 25.5H23L21.6 32H18.4Z" {...ink(LEAF)} />
      <path d={frill(20, 25, 14, 11.5, 18)} {...ink(a)} />
      <path d={frill(20, 25, 9.5, 7.5, 14)} {...ink(b, 0.2)} />
    </>
  ),
  daisy: (a, b) => (
    <>
      <Petals d={round(15.5, 3)} at={around(16)} fill={a} alt={b} edge={0.22} />
      <circle cx="20" cy="20" r="4.6" fill="#f5b915" stroke="#d48f0b" strokeWidth="0.8" />
    </>
  ),
  gerbera: (a, b) => (
    <>
      <Petals d={round(16.5, 2.6)} at={around(22)} fill={a} />
      <Petals d={round(11, 2.2)} at={around(22, 8)} fill={b} />
      <circle cx="20" cy="20" r="5.6" fill="#d9a03a" />
      <circle cx="20" cy="20" r="4" fill="#3b2a14" />
    </>
  ),
  lavender: (a, b) => (
    <>
      {([[-12, 32], [14, 26], [0, 34]] as const).map(([tilt, len]) => (
        <g key={tilt} transform={`rotate(${tilt} 20 38)`}>
          <Stem d={`M20 38V${38 - len}`} w={1.2} />
          {Array.from({ length: 7 }, (_, k) => {
            const side = k % 2 ? 1 : -1
            const y = 38 - len + 1 + k * 2.4
            return <ellipse key={k} cx={20 + side * 1.3} cy={y} rx="1.6" ry="2.4" transform={`rotate(${side * 25} ${20 + side * 1.3} ${y})`} {...ink(k % 2 ? a : b, 0.25)} />
          })}
        </g>
      ))}
    </>
  ),
  lisianthus: (a, b) => (
    <>
      <Petals d={round(15.5, 9)} at={around(5, 36)} fill={b} />
      <Petals d={round(11, 7)} at={around(5, 36)} fill={a} edge={0.15} />
      <Petals d={round(6.5, 4.5)} at={around(5)} fill={shade(a, -0.05)} edge={0.2} />
      <path d="M20 20L18.6 17.4M20 20L21.4 17.4M20 20L20 16.8" stroke="#7d9a45" strokeWidth="0.9" strokeLinecap="round" />
    </>
  ),
  freesia: (a, b) => (
    <>
      <Stem d="M7 37C9 24 17 13 34 9" w={1.4} />
      <Petals d={round(5.5, 3.6)} at={around(5, 15)} x={11} y={22} fill={a} />
      <circle cx="11" cy="22" r="1.4" fill={shade(a, -0.3)} />
      <Petals d={round(4.6, 3)} at={around(5, 40)} x={18} y={13.5} fill={a} />
      <circle cx="18" cy="13.5" r="1.1" fill={shade(a, -0.3)} />
      <ellipse cx="25.5" cy="10" rx="1.8" ry="3.2" transform="rotate(70 25.5 10)" {...ink(b)} />
      <ellipse cx="31" cy="8" rx="1.3" ry="2.4" transform="rotate(75 31 8)" {...ink(LEAF)} />
    </>
  ),
  cosmos: (a) => (
    <>
      <Petals d={notched(16, 6.5)} at={around(8, 22.5)} fill={a} alt={shade(a, -0.06)} />
      <circle cx="20" cy="20" r="3.8" fill="#f2c12e" stroke="#c99212" strokeWidth="0.7" />
    </>
  ),
  'forget-me-not': (a) => (
    <>
      {FORGET_ME_NOT.map(([x, y, s], i) => (
        <g key={i}>
          <Petals d={round(5.6 * s, 3.4 * s)} at={around(5, i * 12)} x={x} y={y} fill={a} edge={0.25} />
          <circle cx={x} cy={y} r={1.9 * s} fill="#fffbe6" />
          <circle cx={x} cy={y} r={s} fill="#f5c518" />
        </g>
      ))}
    </>
  ),
  'babys-breath': (a, b) => (
    <>
      <path d="M20 38V24M20 30L12 16M20 26L28 13M20 24L19 9M12 16L9 10M12 16L15 9M28 13L31 8M28 13L25 7" stroke={STEM} strokeWidth="1" strokeLinecap="round" fill="none" />
      {BABYS_BREATH_TIPS.flatMap(([x, y], i) => CLUSTER.map(([dx, dy], j) => <circle key={`${i}-${j}`} cx={x + dx} cy={y + dy} r="1.7" {...ink(j % 2 ? b : a, 0.25)} />))}
    </>
  ),
  eucalyptus: (a, b) => (
    <>
      <Stem d="M20 38C19 28 21.5 15 20 4" color="#5d6f5a" w={1.4} />
      {EUCALYPTUS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} {...ink(i % 2 ? b : a, 0.25)} />
      ))}
    </>
  ),
  fern: (a, b) => (
    <>
      <Stem d="M20 37Q22 20 18 4" w={1.3} />
      {FERN.map(([x, y, len], i) => (
        <Petals key={i} d={pointed(len, 2.6)} at={[-60, 60]} x={x} y={y} fill={a} alt={b} />
      ))}
    </>
  ),
  ruscus: (a, b) => (
    <>
      <Stem d="M20 38Q19 22 21 5" w={1.2} />
      {RUSCUS.map(([x, y, deg, len], i) => (
        <Petals key={i} d={pointed(len, 3)} at={[deg]} x={x} y={y} fill={i % 2 ? b : a} />
      ))}
    </>
  ),
  pampas: (a, b) => (
    <>
      <Stem d="M20 38Q21 30 19.5 22" color="#b9a27a" w={1.4} />
      <path d="M19.5 24C11 19 11 7 21 2C27 8 27 19 19.5 24Z" {...ink(a, 0.15)} />
      <path d="M19.5 22Q19 12 21 3.5M19.4 19Q15 15 14.5 11M19.4 15Q16 11 16.5 7M19.6 18Q24 14 24.5 9M19.8 13Q23 9.5 22.5 5.5" stroke={shade(a, -0.15)} strokeWidth="0.9" strokeLinecap="round" fill="none" />
      <path d="M17.5 20Q14 17 13.5 14M22 20Q25.5 17.5 25.5 14" stroke={b} strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </>
  ),
  'wax-flower': (a) => (
    <>
      <path d="M20 38V22M20 28L12 18M20 24L28 15M20 22L20 12M12 18L15 11M28 15L25.5 9" stroke={STEM} strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <path d="M20 33l-3-2M20 31l3-2.4M16 23l-2.6-.4M24 19.5l2.6-.2" stroke={LEAF} strokeWidth="1" strokeLinecap="round" />
      {WAX_FLOWERS.map(([x, y, s], i) => (
        <g key={i}>
          <Petals d={round(4.4 * s, 2.8 * s)} at={around(5, i * 15)} x={x} y={y} fill={a} edge={0.25} />
          <circle cx={x} cy={y} r={1.3 * s} fill={shade(a, -0.45)} />
        </g>
      ))}
    </>
  ),
  monstera: (a, b, uid) => (
    <>
      <mask id={uid}>
        <rect width="40" height="40" fill="white" />
        <path d="M2 12L13 16M2 21L14 20M6 30L15 24M38 12L27 16M38 21L26 20M34 30L25 24" stroke="black" strokeWidth="2.2" strokeLinecap="round" />
        <ellipse cx="16.5" cy="10" rx="1.1" ry="1.9" fill="black" />
        <ellipse cx="23.5" cy="10" rx="1.1" ry="1.9" fill="black" />
      </mask>
      <Stem d="M20 38V30" color={shade(a, -0.1)} w={2} />
      <path mask={`url(#${uid})`} d="M20 31C8 31 3 22 4 14C5 6 13 3 20 5C27 3 35 6 36 14C37 22 32 31 20 31Z" {...ink(a, 0.25)} />
      <path d="M20 30V6" stroke={b} strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  olive: (a, b) => (
    <>
      <Stem d="M7 36Q16 24 33 6" color="#7a6a4a" w={1.4} />
      {OLIVE_LEAVES.map(([x, y, deg], i) => (
        <Petals key={i} d={pointed(10, 2.6)} at={[deg]} x={x} y={y} fill={i % 2 ? b : a} />
      ))}
      <ellipse cx="19.5" cy="25" rx="2.4" ry="3.1" {...ink('#4b5a2c')} />
      <ellipse cx="27" cy="17" rx="2.2" ry="2.9" {...ink('#5d3a4a')} />
    </>
  ),
  chocolate: (a, b) => (
    <>
      <path d="M20 27C12 21 9 17 9 13.5C9 10.5 11.3 8.5 14 8.5C16.5 8.5 18.4 10 20 12C21.6 10 23.5 8.5 26 8.5C28.7 8.5 31 10.5 31 13.5C31 17 28 21 20 27Z" {...ink(b)} />
      <path d="M12.5 13C12.8 11.5 14 10.6 15.4 10.8" stroke={shade(b, 0.4)} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M7.5 21H32.5L29.5 33H10.5Z" {...ink(a)} />
      <path d="M11.5 21.5L13 33M15.5 21.5L16.5 33M20 21.5V33M24.5 21.5L23.5 33M28.5 21.5L27 33" stroke={shade(a, -0.25)} strokeWidth="0.7" />
    </>
  ),
  'fairy-lights': (a, b) => (
    <>
      {FAIRY_BULBS.map(([x, y]) => (
        <circle key={x} cx={x} cy={y + 6} r="5.2" fill={a} opacity="0.45" />
      ))}
      <path d="M2 8Q11 22 20 10Q29 22 38 8" stroke={b} strokeWidth="1.2" fill="none" />
      {FAIRY_BULBS.map(([x, y, tilt]) => (
        <g key={x} transform={`rotate(${tilt} ${x} ${y})`}>
          <path d={`M${x} ${y + 2}C${x - 3.4} ${y + 4} ${x - 3} ${y + 10} ${x} ${y + 10.5}C${x + 3} ${y + 10} ${x + 3.4} ${y + 4} ${x} ${y + 2}Z`} {...ink(a)} />
          <rect x={x - 1.3} y={y} width="2.6" height="2.6" rx="0.5" fill={b} />
        </g>
      ))}
    </>
  ),
  butterfly: (a, b) => (
    <>
      <g fill={a} stroke={b} strokeWidth="1.2" strokeLinejoin="round">
        <path d={BUTTERFLY_WING} />
        <path d={BUTTERFLY_WING} transform="matrix(-1 0 0 1 40 0)" />
      </g>
      <g fill="#fff" opacity="0.8">
        <circle cx="9" cy="11" r="1.3" />
        <circle cx="31" cy="11" r="1.3" />
        <circle cx="11" cy="28" r="1" />
        <circle cx="29" cy="28" r="1" />
      </g>
      <ellipse cx="20" cy="21" rx="1.4" ry="7.5" fill={b} />
      <path d="M19.4 14C18.5 10 16.5 7.5 15 7M20.6 14C21.5 10 23.5 7.5 25 7" stroke={b} strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </>
  ),
  plush: (a, b) => (
    <>
      {[11, 29].map((x) => (
        <g key={x}>
          <circle cx={x} cy="11" r="5.2" {...ink(a)} />
          <circle cx={x} cy="11" r="2.6" fill={b} />
        </g>
      ))}
      <circle cx="20" cy="22" r="12.5" {...ink(a)} />
      <circle cx="12.5" cy="24" r="1.8" fill="#f29bb0" opacity="0.5" />
      <circle cx="27.5" cy="24" r="1.8" fill="#f29bb0" opacity="0.5" />
      <ellipse cx="20" cy="26" rx="5.5" ry="4.2" fill={b} />
      <ellipse cx="20" cy="24.2" rx="2" ry="1.4" fill={INK} />
      <path d="M20 25.6V27.2M18 28Q20 29.5 22 28" stroke={INK} strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <circle cx="15" cy="19.5" r="1.3" fill={INK} />
      <circle cx="25" cy="19.5" r="1.3" fill={INK} />
    </>
  ),
  polaroid: (a, b) => (
    <g transform="rotate(-7 20 20)">
      <rect x="8" y="4.5" width="24" height="30" rx="1.5" {...ink(a, 0.18)} />
      <rect x="10.5" y="7" width="19" height="19" fill="#bcd7f0" />
      <circle cx="25" cy="11.5" r="2.4" fill="#ffd36b" />
      <path d="M10.5 26V20.5Q15 15.5 19.5 19.5T29.5 18.5V26Z" fill="#8fbf7f" />
      <path d="M13 30.5h8" stroke={b} strokeWidth="0.9" strokeLinecap="round" />
    </g>
  ),
  cotton: (a, b) => (
    <>
      <Stem d="M20 38V28" color="#7a5a3a" w={1.6} />
      <Petals d={pointed(14, 4)} at={around(5, 36)} fill={b} />
      {around(5).map((deg) => {
        const [x, y] = polar(6, deg)
        return <circle key={deg} cx={x} cy={y} r="6" {...ink(a, 0.15)} />
      })}
      <circle cx="20" cy="20" r="5.5" {...ink(a, 0.15)} />
    </>
  ),
  dried: (a, b) => (
    <>
      <path d="M20 36L12 12M20 36L20 9M20 36L28 13" stroke="#9a8a5a" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      <Petals d={pointed(5.5, 2.6)} at={around(10)} x={12} y={11} fill={a} />
      <circle cx="12" cy="11" r="2" fill={shade(a, -0.3)} />
      <ellipse cx="20" cy="7" rx="2.8" ry="4.6" {...ink(b, 0.15)} />
      <g transform="rotate(20 28 13)">
        {Array.from({ length: 5 }, (_, k) => {
          const side = k % 2 ? 1 : -1
          const y = 11 - k * 2
          return <ellipse key={k} cx={28 + side * 1.2} cy={y} rx="1.2" ry="2" transform={`rotate(${side * 25} ${28 + side * 1.2} ${y})`} {...ink(k % 2 ? b : shade(a, 0.15), 0.25)} />
        })}
      </g>
      <path d="M17 29.5Q20 31.5 23 29.5" stroke="#b08a5a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>
  ),
}

export function SpeciesGlyph({ id, size = 40, colors }: { id: SpeciesId; size?: number; colors?: readonly string[] }) {
  const uid = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const info = SPECIES[id]
  const [preset0, preset1] = info.presets[0]
  const a = colors?.[0] ?? preset0
  const b = colors?.[1] ?? (colors && info.category !== 'accent' ? shade(a, 0.35) : preset1)
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      {GLYPHS[id](a, b, uid)}
    </svg>
  )
}
