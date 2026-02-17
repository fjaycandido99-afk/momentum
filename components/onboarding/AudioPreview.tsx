'use client'

import { useState, useRef, useCallback } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'

interface AudioPreviewProps {
  label: string
  description?: string
  previewUrl?: string
  isSelected?: boolean
  onSelect?: () => void
}

export function AudioPreview({
  label,
  description,
  previewUrl,
  isSelected,
  onSelect,
}: AudioPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const togglePlay = useCallback(() => {
    if (!previewUrl) {
      onSelect?.()
      return
    }

    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      // Clean up previous audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      const audio = new Audio(previewUrl)
      audio.addEventListener('ended', () => setIsPlaying(false))
      audioRef.current = audio
      audio.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
    }
    onSelect?.()
  }, [isPlaying, previewUrl, onSelect])

  return (
    <button
      onClick={togglePlay}
      className={`w-full p-4 rounded-xl text-left transition-all press-scale ${
        isSelected
          ? 'bg-white/15 border border-white/30'
          : 'bg-white/5 border border-white/15 hover:bg-white/10'
      }`}
      aria-pressed={isSelected}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'bg-white/20' : 'bg-white/10'
        }`}>
          {previewUrl ? (
            isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white ml-0.5" />
            )
          ) : (
            <Volume2 className="w-4 h-4 text-white" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {description && (
            <p className="text-xs text-white/75 mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </button>
  )
}
