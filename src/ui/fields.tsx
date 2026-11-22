import { useId, type ReactNode } from 'react'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="field-label">{label}</div>
      {children}
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

export function Slider({ label, value, min, max, step = 0.01, onChange, onCommitStart, onCommitEnd, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; onCommitStart?: () => void; onCommitEnd?: () => void; format?: (v: number) => string }) {
  const id = useId()
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="field-label">{label}</label>
        <span className="text-xs tabular-nums text-ink-500">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <input
        id={id}
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onCommitStart}
        onPointerUp={onCommitEnd}
        onKeyDown={onCommitStart}
        onKeyUp={onCommitEnd}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-9 shrink-0 cursor-pointer rounded-full border border-cream-300 bg-transparent p-0.5 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0 [&::-moz-color-swatch]:rounded-full" aria-label={label} />
      <input
        type="text"
        className="input font-mono uppercase"
        aria-label={`${label} hex`}
        defaultValue={value}
        key={value}
        maxLength={7}
        pattern="#[0-9a-fA-F]{6}"
        onBlur={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && onChange(e.target.value.toLowerCase())}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </div>
  )
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.value} type="button" className="chip" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ink-700">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="relative h-6 w-10 shrink-0 rounded-full bg-ink-300 transition-colors peer-checked:bg-blush-600 peer-focus-visible:outline-2 peer-focus-visible:outline-blush-600 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  )
}
