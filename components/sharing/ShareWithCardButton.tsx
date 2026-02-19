'use client'

import { useRef, useState, useCallback, useEffect, type ReactElement } from 'react'
import { Share2, Loader2, Check, Link, Download } from 'lucide-react'
import { shareImage, generateShareCard } from '@/lib/sharing/generate-share-card'

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

interface ShareWithCardButtonProps {
  /** The share card component to render (hidden off-screen) */
  card: ReactElement
  title: string
  text: string
  url?: string
  filename?: string
  className?: string
}

export function ShareWithCardButton({
  card,
  title,
  text,
  url,
  filename = 'voxu-share.png',
  className = '',
}: ShareWithCardButtonProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [imageDownloaded, setImageDownloaded] = useState(false)

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setImageDownloaded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  const getShareUrl = useCallback(() => url || window.location.href, [url])

  const handleShare = useCallback(async () => {
    if (!cardRef.current || isGenerating) return
    setIsGenerating(true)
    try {
      // Try native share first (works on mobile)
      const blob = await generateShareCard(cardRef.current, filename)
      if (!blob) return

      const file = new File([blob], filename, { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title, text, files: [file] })
          return
        } catch (err) {
          if ((err as Error).name === 'AbortError') return
        }
      }

      // Desktop fallback: download the image automatically, then show social links
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)

      setImageDownloaded(true)
      setShowDropdown(true)
    } finally {
      setIsGenerating(false)
    }
  }, [title, text, filename, isGenerating, getShareUrl])

  const handleCopy = useCallback(async () => {
    const shareUrl = getShareUrl()
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = `${text}\n${shareUrl}`
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setShowDropdown(false)
    setImageDownloaded(false)
  }, [text, getShareUrl])

  return (
    <div ref={containerRef} className="relative inline-block">
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
        className={`flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 transition-all press-scale disabled:opacity-50 ${className}`}
      >
        {isGenerating ? (
          <Loader2 className="w-3.5 h-3.5 text-white/85 animate-spin" />
        ) : (
          <Share2 className="w-3.5 h-3.5 text-white/85" />
        )}
        <span className="text-xs text-white/85">Share</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 bottom-full mb-2 z-50 bg-[#1c1c20] border border-white/15 rounded-xl shadow-xl overflow-hidden min-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          {imageDownloaded && (
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
              <Download className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-green-400">Image saved! Share on:</span>
            </div>
          )}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl())}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors w-full text-left"
            onClick={() => { setShowDropdown(false); setImageDownloaded(false) }}
          >
            <TwitterIcon className="w-4 h-4 text-white/70" />
            <span className="text-sm text-white/85">Share on X</span>
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text + ' ' + getShareUrl())}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors w-full text-left"
            onClick={() => { setShowDropdown(false); setImageDownloaded(false) }}
          >
            <WhatsAppIcon className="w-4 h-4 text-white/70" />
            <span className="text-sm text-white/85">Share on WhatsApp</span>
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors w-full text-left"
          >
            <Link className="w-4 h-4 text-white/70" />
            <span className="text-sm text-white/85">Copy Link</span>
          </button>
        </div>
      )}
    </div>
  )
}
