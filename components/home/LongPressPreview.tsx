'use client'

import React from 'react'
import { X, Clock, User } from 'lucide-react'
import { VideoItem, formatDuration } from './home-types'

interface LongPressPreviewProps {
  video: VideoItem | null
  onClose: () => void
}

export function LongPressPreview({ video, onClose }: LongPressPreviewProps) {
  if (!video) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-md" onClick={onClose} />
      {/* Card */}
      <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-[66] mx-auto max-w-sm rounded-2xl bg-[#1c1c1e] border border-white/25 shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden toast-enter">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-base font-semibold text-white leading-snug flex-1">{video.title}</h3>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>
          {video.channel && (
            <div className="flex items-center gap-1.5 mb-2">
              <User className="w-3 h-3 text-white/60" />
              <span className="text-xs text-white/70">{video.channel}</span>
            </div>
          )}
          {video.duration && video.duration > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-white/60" />
              <span className="text-xs text-white/70">{formatDuration(video.duration)}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
