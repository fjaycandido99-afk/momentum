'use client'

import { useEffect, useState } from 'react'
import { Video, Loader2 } from 'lucide-react'

interface ShareVideoButtonProps {
  mindset: string
  date?: string
  className?: string
}

// "Share as video" — surfaces the audiogram MP4 once it's been rendered (the
// daily cron pre-renders per mindset). Self-gating: it checks availability on
// mount and renders NOTHING until a video exists, so there's never a broken
// button before the Lambda is live. It appears automatically once renders land.
export function ShareVideoButton({ mindset, date, className = '' }: ShareVideoButtonProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const d = date || new Date().toISOString().split('T')[0]

  useEffect(() => {
    let cancelled = false
    fetch(`/api/audiogram?mindset=${encodeURIComponent(mindset)}&date=${d}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data?.url) setUrl(data.url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [mindset, d])

  if (!url) return null

  const share = async () => {
    setLoading(true)
    try {
      const blob = await (await fetch(url)).blob()
      const file = new File([blob], 'voxu-audiogram.mp4', { type: 'video/mp4' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Voxu', text: 'A moment from Voxu 🎧', files: [file] })
      } else {
        window.open(url, '_blank')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') window.open(url, '_blank')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={share}
      disabled={loading}
      aria-label="Share as video"
      className={`p-1.5 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
      ) : (
        <Video className="w-4 h-4 text-white/40" />
      )}
    </button>
  )
}
