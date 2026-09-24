'use client'

import { useEffect, useState } from 'react'
import { Check, Link2, Loader2, Share2, X } from 'lucide-react'
import type { EraToday } from '@/hooks/useEra'
import { eraSlug, joinUrl, shareText } from '@/lib/era/share'
import { trackFeature } from '@/lib/analytics/track'
import { ScrollLock } from '@/components/ui/ScrollLock'

/**
 * The share sheet for an era: a preview of the card, then Share.
 *
 * Two taps on purpose. iOS only lets a page open the share sheet inside the
 * tap that asked for it, and fetching the card (a server-rendered PNG) can
 * outlast that window — so the first tap opens this sheet and loads the
 * card, the second tap shares a file that's already in hand. It also means
 * people see exactly what they're about to post.
 *
 * Falls back to sharing the link as text, then to copying it, so it never
 * dead-ends on a phone or browser that can't share images.
 */
const NUMBERS_KEY = 'voxu.share.numbers'

export function ShareEraSheet({ era, onClose }: { era: EraToday; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'copied'>('idle')
  // Whether the record goes on the card. Their call, remembered on this
  // device only: someone at 4 of 12 shouldn't have to advertise it to share.
  const [showNumbers, setShowNumbers] = useState(() => {
    try { return localStorage.getItem(NUMBERS_KEY) !== 'off' } catch { return true }
  })
  const toggleNumbers = () => {
    const next = !showNumbers
    setShowNumbers(next)
    try { localStorage.setItem(NUMBERS_KEY, next ? 'on' : 'off') } catch { /* stays for this sheet */ }
  }

  const url = joinUrl(era.key, era.id)
  const text = shareText({ key: era.key, title: era.title, day: era.day, lengthDays: era.lengthDays, complete: era.step === 'complete' })

  // Opened vs actually shared: the gap between them is the whole question
  // about sharing, and neither leaves a row behind.
  useEffect(() => { trackFeature('era', 'open', 'share_opened') }, [])

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    // The old card must not be shareable while the new one loads.
    setFile(null)
    setPreview(null)
    setLoadFailed(false)
    fetch(showNumbers ? '/api/era/card' : '/api/era/card?numbers=0', { cache: 'no-store' })
      .then(r => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then(blob => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPreview(objectUrl)
        setFile(new File([blob], `voxu-${eraSlug(era.key)}-day-${era.day}.png`, { type: 'image/png' }))
      })
      .catch(() => { if (!cancelled) setLoadFailed(true) })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [era.key, era.day, showNumbers])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setStatus('copied')
      trackFeature('era', 'complete', 'share_sent')
    } catch { /* clipboard blocked — nothing more to try */ }
  }

  const share = async () => {
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text} ${url}` })
        trackFeature('era', 'complete', 'share_sent')
        return onClose()
      }
      if (navigator.share) {
        await navigator.share({ text, url })
        trackFeature('era', 'complete', 'share_sent')
        return onClose()
      }
      await copy()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') await copy()
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col" role="dialog" aria-modal="true" aria-label="Share your era">
      <ScrollLock />
      <div className="flex justify-end px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-8 py-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${era.title}, day ${era.day} share card`} className="max-h-full max-w-full rounded-2xl border border-white/10 shadow-2xl" />
        ) : loadFailed ? (
          <p className="text-sm text-white/60 text-center">Couldn&rsquo;t make the card right now — you can still share the link.</p>
        ) : (
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        )}
      </div>

      <div className="px-5 space-y-2.5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}>
        <div className="flex items-center justify-between gap-3 px-1 pb-1">
          <p className="text-sm text-white/80">Show my numbers</p>
          <button
            onClick={toggleNumbers}
            role="switch"
            aria-checked={showNumbers}
            aria-label="Show my numbers on the card"
            className={`h-6 w-11 shrink-0 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              showNumbers ? 'bg-white' : 'bg-white/10'
            }`}
          >
            <div className={`h-4 w-4 rounded-full shadow-lg transition-transform ${showNumbers ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white'}`} />
          </button>
        </div>
        <button
          onClick={share}
          disabled={!file && !loadFailed}
          className="w-full py-4 rounded-2xl bg-white text-black text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          <Share2 className="w-4 h-4" /> Share your era
        </button>
        <button
          onClick={copy}
          className="w-full py-3.5 rounded-2xl border border-white/20 text-white/85 text-sm flex items-center justify-center gap-2"
        >
          {status === 'copied' ? <><Check className="w-4 h-4" /> Link copied</> : <><Link2 className="w-4 h-4" /> Copy the join link</>}
        </button>
        <p className="text-[11px] text-white/40 text-center pt-1">
          {showNumbers
            ? 'The card shows your era and your record — never what you promised.'
            : 'The card shows your era and the day — no numbers, never what you promised.'}
        </p>
      </div>
    </div>
  )
}
