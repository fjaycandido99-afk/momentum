'use client'

import React from 'react'
import { Play, Pause, Heart } from 'lucide-react'
import { EqBars } from '@/components/ui/EqBars'
import { VideoItem, formatDuration } from './home-types'

interface SavedMotivationSectionProps {
  videos: VideoItem[]
  backgrounds: string[]
  activeCardId: string | null
  tappedCardId: string | null
  musicPlaying: boolean
  onPlay: (video: VideoItem, index: number) => void
  onRemoveFavorite: (video: VideoItem) => void
  onMagneticMove: (e: React.PointerEvent<any>) => void
  onMagneticLeave: (e: React.PointerEvent<any>) => void
  onRipple: (e: React.MouseEvent<any>) => void
  label?: string
  subtitle?: string
}

export function SavedMotivationSection({
  videos, backgrounds, activeCardId, tappedCardId, musicPlaying,
  onPlay, onRemoveFavorite, onMagneticMove, onMagneticLeave, onRipple,
  label = 'Your Saves', subtitle = 'Motivation videos you loved',
}: SavedMotivationSectionProps) {
  if (videos.length === 0) return null

  return (
    <div className="mb-10 liquid-reveal section-fade-bg">
      <div className="flex items-center justify-between px-6 mb-5">
        <div className="flex items-center gap-2.5 section-header">
          <div>
            <h2 className="section-header-title parallax-header">{label}</h2>
            <p className="section-header-subtitle">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto px-6 pb-3 scrollbar-hide snap-row">
        {videos.map((video, index) => {
          const isCardActive = activeCardId === video.id
          return (
            <button
              key={video.id}
              aria-label={`Play ${video.title}`}
              onClick={(e) => {
                onRipple(e)
                onPlay(video, index)
              }}
              className="shrink-0 w-40 text-left group press-scale snap-card card-stagger"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div
                className={`relative w-40 h-40 rounded-2xl card-surface flex items-center justify-center magnetic-tilt ${isCardActive ? 'card-now-playing breathing-glow' : ''}`}
                onPointerMove={onMagneticMove}
                onPointerLeave={onMagneticLeave}
              >
                <img
                  src={video.thumbnail || backgrounds[index % backgrounds.length]}
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/20" />

                {video.duration && video.duration > 0 && (
                  <span className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] text-white/90 font-medium">
                    {formatDuration(video.duration)}
                  </span>
                )}

                {/* Filled heart — tap removes */}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveFavorite(video) }}
                  aria-label="Remove from favorites"
                  className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 text-red-500" fill="currentColor" />
                </button>

                <div className={`relative z-10 rounded-full ${tappedCardId === video.id ? 'play-tap' : ''}`}>
                  {isCardActive ? (
                    musicPlaying ? (
                      <EqBars />
                    ) : (
                      <Pause className="w-8 h-8 text-white drop-shadow-lg icon-morph" fill="white" />
                    )
                  ) : (
                    <Play className="w-8 h-8 text-white group-hover:text-white transition-colors drop-shadow-lg icon-morph" fill="rgba(255,255,255,0.45)" />
                  )}
                </div>
              </div>
              <p className="text-sm text-white/85 mt-2 line-clamp-2 leading-tight">{video.title}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
