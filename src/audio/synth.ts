import type { Bouquet } from '@/src/state/schema'

type Sfx = 'rustle' | 'crinkle' | 'tie' | 'chime' | 'pop' | 'select'
type Track = Bouquet['scene']['music']

let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicGain: GainNode | null = null
let muted = false
let musicTimer: number | undefined
let noise: AudioBuffer | null = null

function audio() {
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.8
    master.connect(ctx.destination)
    musicGain = ctx.createGain()
    musicGain.gain.value = 0.5
    musicGain.connect(master)
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(value: boolean) {
  muted = value
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.8, ctx.currentTime, 0.05)
}

function tone(freq: number, start: number, duration: number, opts: { type?: OscillatorType; gain?: number; attack?: number; out?: AudioNode } = {}) {
  const a = audio()
  if (!a || !master) return
  const osc = a.createOscillator()
  const env = a.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.value = freq
  const peak = opts.gain ?? 0.2
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(peak, start + (opts.attack ?? 0.008))
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(env).connect(opts.out ?? master)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

function burst(start: number, duration: number, freq: number, gain: number, q = 1) {
  const a = audio()
  if (!a || !master || !noise) return
  const src = a.createBufferSource()
  src.buffer = noise
  src.playbackRate.value = 0.5 + Math.random()
  const filter = a.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = q
  const env = a.createGain()
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(gain, start + 0.01)
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  src.connect(filter).connect(env).connect(master)
  src.start(start, Math.random() * 0.5)
  src.stop(start + duration + 0.05)
}

export function sfx(name: Sfx) {
  const a = audio()
  if (!a || muted) return
  const t = a.currentTime
  if (name === 'rustle') for (let i = 0; i < 4; i++) burst(t + i * 0.035, 0.12, 3500 + Math.random() * 2500, 0.05, 0.8)
  if (name === 'crinkle') for (let i = 0; i < 9; i++) burst(t + Math.random() * 0.35, 0.04, 2000 + Math.random() * 5000, 0.08, 3)
  if (name === 'tie') {
    burst(t, 0.25, 1800, 0.05, 0.6)
    tone(520, t + 0.05, 0.25, { type: 'triangle', gain: 0.05 })
  }
  if (name === 'chime') {
    const f = [1046.5, 1174.7, 1318.5, 1568, 1760][Math.floor(Math.random() * 5)]
    tone(f, t, 1.4, { gain: 0.07 })
    tone(f * 2.01, t, 0.7, { gain: 0.02 })
  }
  if (name === 'pop') tone(660, t, 0.12, { type: 'triangle', gain: 0.08 })
  if (name === 'select') tone(880, t, 0.08, { gain: 0.05 })
}

const NOTE = (semitones: number) => 261.63 * Math.pow(2, semitones / 12)
const PROGRESSION = [
  [0, 4, 7, 11],
  [-3, 0, 4, 7],
  [-7, -3, 0, 5],
  [-5, -1, 2, 7],
]

function scheduleBar(track: Track, bar: number, start: number) {
  const chord = PROGRESSION[bar % 4]
  if (!musicGain) return
  if (track === 'music-box') {
    const pattern = [0, 2, 1, 3, 2, 1, 3, 2]
    pattern.forEach((k, i) => tone(NOTE(chord[k] + 12), start + i * 0.3, 1.6, { gain: 0.08, out: musicGain! }))
  }
  if (track === 'warm-pad') {
    chord.forEach((n) => {
      ;[-4, 4].forEach((detune) => tone(NOTE(n - 12) * Math.pow(2, detune / 1200), start, 2.6, { type: 'triangle', gain: 0.035, attack: 0.9, out: musicGain! }))
    })
    tone(NOTE(chord[0] - 24), start, 2.5, { gain: 0.05, attack: 0.5, out: musicGain })
  }
  if (track === 'lofi') {
    ;[0, 1.2].forEach((offset) => chord.forEach((n) => tone(NOTE(n), start + offset, 1.0, { type: 'triangle', gain: 0.03, out: musicGain! })))
    ;[0, 0.6, 1.2, 1.8].forEach((beat, i) => {
      if (i % 2 === 0) tone(70, start + beat, 0.25, { gain: 0.12, out: musicGain! })
      burst(start + beat + 0.3, 0.05, 8000, 0.02, 1)
    })
  }
}

export function playMusic(track: Track, volume: number) {
  stopMusic()
  const a = audio()
  if (!a || track === 'none' || !musicGain) return
  musicGain.gain.setTargetAtTime(volume * 0.9, a.currentTime, 0.2)
  const barLength = 2.4
  let bar = 0
  let next = a.currentTime + 0.1
  const tick = () => {
    while (next < a.currentTime + 1.2) {
      scheduleBar(track, bar++, next)
      next += barLength
    }
  }
  tick()
  musicTimer = window.setInterval(tick, 300)
}

export function setMusicVolume(volume: number) {
  if (musicGain && ctx) musicGain.gain.setTargetAtTime(volume * 0.9, ctx.currentTime, 0.1)
}

export function stopMusic() {
  clearInterval(musicTimer)
  musicTimer = undefined
}

export const unlockAudio = () => audio()
