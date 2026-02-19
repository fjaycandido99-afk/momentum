'use client'

import React from 'react'
import { Play, Pause, Clock } from 'lucide-react'
import type { RecentlyPlayedItem } from '@/hooks/useRecentlyPlayed'

interface RecentlyPlayedSectionProps {
  items: RecentlyPlayedItem[]
  activeCardId: string | null
  musicPlaying: boolean
  onPlay: (item: RecentlyPlayedItem, index: number) => void
  onMagneticMove: (e: React.PointerEvent<any>) => void
  onMagneticLeave: (e: React.PointerEvent<any>) => void
  onRipple: (e: React.MouseEvent<any>) => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function RecentlyPlayedSection({
  items, activeCardId, musicPlaying, onPlay, onMagneticMove, onMagneticLeave, onRipple,
}: RecentlyPlayedSectionProps) {
  if (items.length === 0) return null

  return (
    <div className="mb-8 liquid-reveal section-fade-bg">
      <div className="flex items-center gap-2 px-6 mb-4">
        <Clock className="w-4 h-4 text-white/70" />
        <div>
          <h2 className="text-lg font-semibold text-white parallax-header">Recently Played</h2>
          <p className="text-xs text-white/70 mt-0.5">Pick up where you left off</p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide snap-row">
        {items.map((item, index) => {
          const isCardActive = activeCardId === item.youtubeId

          return (
            <button
              key={`${item.youtubeId}-${item.playedAt}`}
              aria-label={`Play ${item.title}`}
              onClick={(e) => {
                onRipple(e)
                onPlay(item, index)
              }}
              className="shrink-0 w-36 text-left group press-scale snap-card card-stagger"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div
                className={`relative w-36 h-36 rounded-2xl card-gradient-border flex items-center justify-center magnetic-tilt ${isCardActive ? 'card-now-playing breathing-glow' : ''}`}
                onPointerMove={onMagneticMove}
                onPointerLeave={onMagneticLeave}
              >
                {item.background && (
                  <img
                    src={item.background}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-opacity"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

                {/* Type badge */}
                <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md bg-black/60 text-[9px] text-white/75 font-medium uppercase tracking-wider">
                  {item.type === 'music' ? item.genreWord || 'Music' : 'Motivation'}
                </span>

                {/* Time ago */}
                <span className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-black/60 text-[9px] text-white/70 font-medium">
                  {timeAgo(item.playedAt)}
                </span>

                <div className="relative z-10 rounded-full">
                  {isCardActive ? (
                    musicPlaying ? (
                      <div className="eq-bars"><span /><span /><span /></div>
                    ) : (
                      <Pause className="w-7 h-7 text-white drop-shadow-lg icon-morph" fill="white" />
                    )
                  ) : (
                    <Play className="w-7 h-7 text-white group-hover:text-white transition-colors drop-shadow-lg icon-morph" fill="rgba(255,255,255,0.45)" />
                  )}
                </div>
              </div>
              <p className="text-xs text-white/70 mt-1.5 line-clamp-2 leading-tight">{item.title}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
