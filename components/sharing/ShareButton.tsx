'use client'

import { useState, useCallback } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

interface ShareButtonProps {
  title: string
  text: string
  url?: string
  className?: string
  size?: 'sm' | 'md'
}

export function ShareButton({ title, text, url, className = '', size = 'md' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(async () => {
    const shareUrl = url || window.location.href
    const shareData = { title, text, url: shareUrl }

    // Try native Web Share API
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        // User cancelled or API error — fall through to clipboard
        if ((err as Error).name === 'AbortError') return
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Last resort: textarea fallback
      const textarea = document.createElement('textarea')
      textarea.value = `${text}\n${shareUrl}`
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [title, text, url])

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const padding = size === 'sm' ? 'p-2' : 'p-2.5'

  return (
    <button
      onClick={handleShare}
      aria-label={copied ? 'Copied to clipboard' : `Share ${title}`}
      className={`${padding} rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all press-scale ${className}`}
    >
      {copied ? (
        <Check className={`${iconSize} text-green-400`} />
      ) : (
        <Share2 className={`${iconSize} text-white/70`} />
      )}
    </button>
  )
}
