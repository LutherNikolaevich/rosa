import { useEffect, useState } from 'react'
import type { LinkOptions } from '@/src/state/schema'
import { useEditor } from '../state/store'
import { deleteBouquet, share, siteOrigin, type ShareResult } from '../state/share'
import { sceneApi } from '../scene/sceneApi'
import { t } from '../i18n'
import { Modal } from './Modal'
import { Field, Segmented, Toggle } from './fields'
import { Icon } from './Icon'
import { toast } from './toast'
import { sfx } from '../audio/synth'

type Expiry = 'never' | '1' | '7' | '30'

const MOBILE = /Android|iPhone|iPad/.test(navigator.userAgent)

const ALL_SOCIAL: { name: string; href: (url: string, text: string) => string; mobileOnly?: boolean }[] = [
  { name: 'Messenger', href: (u) => (MOBILE ?`fb-messenger://share/?link=${encodeURIComponent(u)}` : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`) },
  { name: 'WhatsApp', href: (u, m) => `https://wa.me/?text=${encodeURIComponent(`${m} ${u}`)}` },
  { name: 'Viber', href: (u, m) => `viber://forward?text=${encodeURIComponent(`${m} ${u}`)}`, mobileOnly: true },
  { name: 'Telegram', href: (u, m) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(m)}` },
  { name: 'X', href: (u, m) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(m)}` },
  { name: 'Email', href: (u, m) => `mailto:?subject=${encodeURIComponent(m)}&body=${encodeURIComponent(`${m}\n\n${u}`)}` },
  { name: 'SMS', href: (u, m) => `sms:?&body=${encodeURIComponent(`${m} ${u}`)}`, mobileOnly: true },
]
const SOCIAL = ALL_SOCIAL.filter((s) => MOBILE || !s.mobileOnly)

export const copyLink = (url: string) =>
  navigator.clipboard.writeText(url).then(
    () => (toast(t('share.copied')), true),
    () => (toast(t('share.copyFailed')), false),
  )

const SIZES = { '1080p': 1080, '2K': 1440, '4K': 2160 } as const

export const downloadBlob = (blob: Blob, name: string) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export async function downloadImage(size: keyof typeof SIZES, vertical: boolean, transparent: boolean) {
  if (!sceneApi.capture) throw new Error('capture unavailable')
  const short = SIZES[size]
  const long = Math.round((short * 16) / 9)
  const blob = await sceneApi.capture({ width: vertical ? short : long, height: vertical ? long : short, transparent, type: 'image/png' })
  downloadBlob(blob, `bouquet-${size}${vertical ? '-story' : ''}.png`)
}

function Done({ result, onDeleted }: { result: ShareResult; onDeleted: () => void }) {
  const [qr, setQr] = useState('')
  const [size, setSize] = useState<keyof typeof SIZES>('1080p')
  const [vertical, setVertical] = useState(false)
  const [transparent, setTransparent] = useState(false)
  const link = useEditor((s) => s.link)
  const message = t('share.message')
  useEffect(() => {
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(result.url, { margin: 1, width: 512, color: { dark: '#2b2121', light: '#fffcf8' } }))
      .then(setQr)
      .catch(() => setQr(''))
  }, [result.url])
  const copy = async () => {
    if (await copyLink(result.url)) sfx('pop')
  }
  const embed = result.kind === 'link' ? `<iframe src="${siteOrigin()}/b/${result.id}?embed=1" width="480" height="640" style="border:0;border-radius:16px" allow="autoplay" title="A bouquet"></iframe>` : ''
  return (
    <div className="space-y-5">
      {result.kind === 'hash' && <p className="rounded-2xl bg-blush-100 p-3 text-sm text-blush-700">{t('share.fallback')}</p>}
      <div className="flex gap-2">
        <input readOnly value={result.url} className="input font-mono text-xs" aria-label={t('share.link')} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn-primary shrink-0" onClick={copy}>
          <Icon name="copy" size={16} /> {t('share.copy')}
        </button>
      </div>
      {'share' in navigator && (
        <button type="button" className="btn w-full border border-cream-300" onClick={() => navigator.share({ title: message, text: message, url: result.url }).catch(() => {})}>
          <Icon name="send" size={16} /> {t('share.native')}
        </button>
      )}
      <div className="flex flex-wrap gap-2">
        {SOCIAL.map((s) => (
          <a key={s.name} href={s.href(result.url, message)} target="_blank" rel="noopener noreferrer" className="chip">
            {s.name}
          </a>
        ))}
      </div>
      {qr && (
        <Field label={t('share.qr')}>
          <div className="flex items-center gap-4">
            <img src={qr} alt={t('share.qr')} className="h-28 w-28 rounded-xl border border-cream-200" />
            <a href={qr} download="bouquet-qr.png" className="btn border border-cream-300">
              <Icon name="download" size={16} /> {t('share.downloadQr')}
            </a>
          </div>
        </Field>
      )}
      <Field label={t('share.download')}>
        <Segmented label={t('share.size')} value={size} options={Object.keys(SIZES).map((s) => ({ value: s as keyof typeof SIZES, label: s }))} onChange={setSize} />
        <Toggle label={t('share.vertical')} checked={vertical} onChange={setVertical} />
        <Toggle label={t('share.transparent')} checked={transparent} onChange={setTransparent} />
        <button type="button" className="btn border border-cream-300" onClick={() => downloadImage(size, vertical, transparent).catch(() => toast(t('viewer.keepFailed')))}>
          <Icon name="download" size={16} /> PNG
        </button>
      </Field>
      {embed && (
        <Field label={t('share.embed')}>
          <textarea readOnly className="input h-20 font-mono text-xs" aria-label={t('share.embed')} value={embed} onFocus={(e) => e.target.select()} />
        </Field>
      )}
      {result.kind === 'link' && link && (
        <Field label={t('share.manage')}>
          <button
            type="button"
            className="btn text-blush-700"
            onClick={async () => {
              if (!confirm(t('share.deleteConfirm'))) return
              if (await deleteBouquet(link).catch(() => false)) {
                toast(t('share.deleted'))
                useEditor.setState({ link: null })
                onDeleted()
              } else toast(t('share.deleteFailed'))
            }}
          >
            <Icon name="trash" size={16} /> {t('share.delete')}
          </button>
        </Field>
      )}
    </div>
  )
}

export function ShareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditor((s) => s.doc)
  const link = useEditor((s) => s.link)
  const [expiry, setExpiry] = useState<Expiry>('never')
  const [oneTime, setOneTime] = useState(false)
  const [readReceipt, setReadReceipt] = useState(false)
  const [secretOn, setSecretOn] = useState(!!doc.reveal.secret)
  const [question, setQuestion] = useState(doc.reveal.secret?.q ?? '')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ShareResult | null>(null)
  useEffect(() => {
    if (open) setResult(null)
  }, [open])

  const create = async () => {
    setBusy(true)
    sfx('tie')
    const options: Omit<LinkOptions, 'snapshot'> = {
      expiresAt: expiry === 'never' ? null : new Date(Date.now() + Number(expiry) * 86400000).toISOString(),
      oneTime,
      allowRemix: false,
      readReceipt,
      secretAnswer: secretOn && answer.trim() ? answer : null,
    }
    const shareDoc = { ...doc, reveal: { ...doc.reveal, secret: secretOn && question.trim() ? { q: question.trim() } : null } }
    const snapshot = await sceneApi.capture?.({ width: 720, height: 720, type: 'image/jpeg', quality: 0.85 }).catch(() => null)
    const out = await share(shareDoc, options, snapshot ?? null, link)
    if (out.kind === 'link') {
      useEditor.setState({ link: { id: out.id, editToken: out.editToken } })
      useEditor.getState().commit(() => out.doc)
    }
    setResult(out)
    setBusy(false)
  }

  const secretIncomplete = secretOn && (!question.trim() || (!answer.trim() && !link))
  return (
    <Modal open={open} onClose={onClose} title={t('share.title')}>
      {result ? (
        <Done result={result} onDeleted={() => setResult(null)} />
      ) : (
        <div className="space-y-5">
          {!doc.items.length && <p className="rounded-2xl bg-blush-100 p-3 text-sm text-blush-700">{t('share.emptyWarning')}</p>}
          <Field label={t('share.expires')}>
            <Segmented label={t('share.expires')} value={expiry} options={[{ value: 'never', label: t('share.never') }, { value: '1', label: t('share.oneDay') }, { value: '7', label: t('share.days', { count: 7 }) }, { value: '30', label: t('share.days', { count: 30 }) }]} onChange={setExpiry} />
          </Field>
          <div className="space-y-3 rounded-2xl bg-white/60 p-4">
            <Toggle label={t('share.oneTime')} checked={oneTime} onChange={setOneTime} />
            <Toggle label={t('share.readReceipt')} checked={readReceipt} onChange={setReadReceipt} />
            <Toggle label={t('share.secret')} checked={secretOn} onChange={setSecretOn} />
            {secretOn && (
              <div className="space-y-2">
                <input className="input" maxLength={120} placeholder={t('share.secretQuestionPlaceholder')} aria-label={t('share.secretQuestion')} value={question} onChange={(e) => setQuestion(e.target.value)} />
                <input className="input" maxLength={120} placeholder={t('share.secretAnswer')} aria-label={t('share.secretAnswer')} value={answer} onChange={(e) => setAnswer(e.target.value)} />
              </div>
            )}
          </div>
          <button type="button" className="btn-primary h-11 w-full text-base" disabled={busy || !doc.items.length || secretIncomplete} onClick={create}>
            <Icon name="link" size={16} /> {busy ? t('share.creating') : link ? t('share.update') : t('share.create')}
          </button>
        </div>
      )}
    </Modal>
  )
}
