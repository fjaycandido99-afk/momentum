'use client'

import { useEffect, useState } from 'react'
import { Loader2, Share2, X } from 'lucide-react'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { getAchievementById } from '@/lib/achievements'
import { trackFeature } from '@/lib/analytics/track'

/**
 * Share one relic as a Story-sized card (/api/relics/card).
 *
 * Two taps, like the era's share sheet: iOS only opens the share sheet
 * inside the tap that asked for it, and rendering the card can outlast that
 * tap — so opening fetches the card and shows it, and Share sends a file
 * already in hand. Falls back to a link where images can't be shared.
 */
export function ShareRelicSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const a = getAchievementById(id)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    trackFeature('relics', 'open', 'share_opened')
    fetch(`/api/relics/card?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then(blob => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPreview(objectUrl)
        setFile(new File([blob], `voxu-relic-${id}.png`, { type: 'image/png' }))
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])

  const text = a ? `${a.title} — earned on Voxu.` : 'Earned on Voxu.'

  const share = async () => {
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text })
      } else if (navigator.share) {
        await navigator.share({ text, url: 'https://voxu.app' })
      } else {
        return
      }
      trackFeature('relics', 'complete', 'share_sent')
    } catch {
      // Dismissing the share sheet throws; that is not an error.
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex flex-col" role="dialog" aria-modal="true" aria-label="Share your relic">
      <ScrollLock />
      <div className="flex justify-end px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center px-6 py-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${a?.title ?? 'Relic'} share card`} className="max-h-full max-w-full rounded-2xl border border-white/10 shadow-2xl" />
        ) : failed ? (
          <p className="text-sm text-white/60 text-center">Couldn&rsquo;t make the card right now.</p>
        ) : (
          <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
        )}
      </div>
      <div className="px-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
        <button
          onClick={share}
          disabled={!file && !failed}
          className="w-full py-3.5 rounded-xl bg-white text-black text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Share2 className="w-4 h-4" /> Share this relic
        </button>
      </div>
    </div>
  )
}
