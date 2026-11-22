import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import { Icon } from './Icon'

const LIMIT = 60

export function VoiceRecorder({ url, onRecorded, onRemove }: { url?: string; onRecorded: (blob: Blob) => void; onRemove: () => void }) {
  const [seconds, setSeconds] = useState(0)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => clearInterval(timer.current), [])

  const stop = () => {
    clearInterval(timer.current)
    recorder.current?.state === 'recording' && recorder.current.stop()
    setRecording(false)
  }

  const start = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m))
      const rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 48000 } : undefined)
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        onRecorded(new Blob(chunks, { type: rec.mimeType }))
      }
      recorder.current = rec
      rec.start()
      setRecording(true)
      setSeconds(0)
      const began = performance.now()
      timer.current = window.setInterval(() => {
        const s = Math.floor((performance.now() - began) / 1000)
        setSeconds(s)
        if (s >= LIMIT) stop()
      }, 250)
    } catch {
      setError(t('gift.micDenied'))
    }
  }

  if (url && !recording)
    return (
      <div className="flex items-center gap-2">
        <audio controls src={url} className="h-10 flex-1" />
        <button type="button" className="btn-icon" aria-label={t('gift.removeVoice')} onClick={onRemove}>
          <Icon name="trash" />
        </button>
      </div>
    )
  return (
    <div className="space-y-1">
      <button type="button" className={recording ? 'btn-primary' : 'btn border border-cream-300'} onClick={recording ? stop : start}>
        <Icon name={recording ? 'stop' : 'mic'} />
        {recording ? `${t('gift.stop')} · 0:${String(seconds).padStart(2, '0')}` : t('gift.record')}
      </button>
      {error && <p role="alert" className="text-xs text-blush-700">{error}</p>}
    </div>
  )
}
