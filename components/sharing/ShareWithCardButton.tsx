'use client'

import { useRef, useState, useCallback, type ReactElement } from 'react'
import { Share2, Loader2 } from 'lucide-react'
import { shareImage } from '@/lib/sharing/generate-share-card'

interface ShareWithCardButtonProps {
  /** The share card component to render (hidden off-screen) */
  card: ReactElement
  title: string
  text: string
  filename?: string
  className?: string
}

export function ShareWithCardButton({
  card,
  title,
  text,
  filename = 'voxu-share.png',
  className = '',
}: ShareWithCardButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleShare = useCallback(async () => {
    if (!cardRef.current || isGenerating) return
    setIsGenerating(true)
    try {
      await shareImage(cardRef.current, title, text, filename)
    } finally {
      setIsGenerating(false)
    }
  }, [title, text, filename, isGenerating])

  return (
    <>
      {/* Hidden off-screen card for rendering */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div ref={cardRef}>
          {card}
        </div>
      </div>

      <button
        onClick={handleShare}
        disabled={isGenerating}
        aria-label={`Share ${title} as image`}
        className={`flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all press-scale disabled:opacity-50 ${className}`}
      >
        {isGenerating ? (
          <Loader2 className="w-3.5 h-3.5 text-white/70 animate-spin" />
        ) : (
          <Share2 className="w-3.5 h-3.5 text-white/70" />
        )}
        <span className="text-xs text-white/70">Share</span>
      </button>
    </>
  )
}
