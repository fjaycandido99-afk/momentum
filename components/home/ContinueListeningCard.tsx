'use client'

import React from 'react'
import { Play } from 'lucide-react'
import { VideoItem, formatDuration } from './home-types'

interface ContinueListeningCardProps {
  video: VideoItem
  currentTime: number
  duration: number
  background: string
  onResume: () => void
  onOpenPlayer: () => void
}

export function ContinueListeningCard({
  video, currentTime, duration, background, onResume, onOpenPlayer,
}: ContinueListeningCardProps) {
  if (!duration || duration <= 0) return null
  const progress = Math.min(currentTime / duration, 1)
  const remaining = duration - currentTime

  return (
    <div className="px-6 mb-6 liquid-reveal">
      <button
        onClick={onOpenPlayer}
        className="relative w-full rounded-2xl overflow-hidden text-left group press-scale"
      >
        <img
          src={background}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        <div className="relative z-10 flex items-center gap-4 p-4">
          <button
            onClick={(e) => { e.stopPropagation(); onResume() }}
            className="shrink-0 w-12 h-12 rounded-full bg-white/15 border border-white/25 flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/75 font-medium uppercase tracking-wide mb-0.5">Continue listening</p>
            <p className="text-sm text-white line-clamp-1 font-medium">{video.title}</p>
            <p className="text-xs text-white/70 mt-0.5">{formatDuration(remaining)} remaining</p>
            {/* Progress bar */}
            <div className="mt-2 h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/60 transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}
