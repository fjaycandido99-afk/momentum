'use client'

import React, { useState } from 'react'
import { Play, Pause, Music, RefreshCw, Heart } from 'lucide-react'
import { VideoItem, formatDuration } from './home-types'
import { SoftLockBadge } from '@/components/premium/SoftLock'
import type { FreemiumContentType } from '@/lib/subscription-constants'

interface MusicGenreSectionProps {
  genre: { id: string; word: string; tagline: string }
  videos: VideoItem[]
  genreBackgrounds: string[]
  fallbackBackgrounds: string[]
  genreIndex: number
  loading: boolean
  activeCardId: string | null
  tappedCardId: string | null
  musicPlaying: boolean
  isContentFree: (type: FreemiumContentType, index: number | string) => boolean
  onPlay: (video: VideoItem, index: number, genreId: string, genreWord: string, isLocked: boolean) => void
  onMagneticMove: (e: React.PointerEvent<any>) => void
  onMagneticLeave: (e: React.PointerEvent<any>) => void
  onRipple: (e: React.MouseEvent<any>) => void
  heroCard?: boolean
  onShuffle?: () => void
  shuffling?: boolean
  favoriteIds?: Set<string>
  onToggleFavorite?: (video: VideoItem) => void
  progressPercent?: number
  onLongPressStart?: (video: VideoItem) => void
  onLongPressEnd?: () => void
}

export function MusicGenreSection({
  genre, videos, genreBackgrounds, fallbackBackgrounds, genreIndex, loading,
  activeCardId, tappedCardId, musicPlaying, isContentFree, onPlay,
  onMagneticMove, onMagneticLeave, onRipple,
  heroCard, onShuffle, shuffling, favoriteIds, onToggleFavorite, progressPercent,
  onLongPressStart, onLongPressEnd,
}: MusicGenreSectionProps) {
  const [heartPopId, setHeartPopId] = useState<string | null>(null)

  return (
    <div className="mb-12 liquid-reveal section-fade-bg">
      <div className="flex items-center justify-between px-8 mb-4">
        <div>
          <h2 className={`text-lg font-semibold text-white parallax-header genre-accent-${genre.id}`}>{genre.word}</h2>
          <p className="text-xs text-white/95 mt-0.5">{genre.tagline}</p>
        </div>
        {onShuffle && (
          <button
            onClick={onShuffle}
            disabled={shuffling}
            aria-label="Shuffle videos"
            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors press-scale"
          >
            <RefreshCw className={`w-4 h-4 text-white/70 ${shuffling ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto px-8 pb-2 scrollbar-hide snap-row">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => {
            const isHeroSkel = i === 0 && heroCard
            const skelSize = isHeroSkel ? 'w-56 h-56' : 'w-40 h-40'
            const skelWidth = isHeroSkel ? 'w-56' : 'w-40'
            return (
              <div key={i} className={`shrink-0 ${skelWidth}`}>
                <div className={`${skelSize} rounded-2xl card-gradient-border skeleton-shimmer`} />
                <div className="h-3 bg-[#111113] rounded mt-2 w-3/4" />
                <div className="h-2 bg-[#111113] rounded mt-1.5 w-1/2" />
              </div>
            )
          })
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full py-10 gap-2">
            <Music className="w-6 h-6 text-white/30" />
            <p className="text-sm text-white/40">No tracks yet</p>
          </div>
        ) : (
          videos.slice(0, 8).map((video, index) => {
            const isLocked = !isContentFree('music', index)
            const isCardActive = activeCardId === video.id
            const isHero = index === 0 && heroCard
            const isFavorited = favoriteIds?.has(video.youtubeId)
            const cardSize = isHero ? 'w-56 h-56' : 'w-40 h-40'
            const containerWidth = isHero ? 'w-56' : 'w-40'

            return (
              <button
                key={video.id}
                aria-label={`Play ${video.title}${isLocked ? ' (premium)' : ''}`}
                onClick={(e) => {
                  onRipple(e)
                  onPlay(video, index, genre.id, genre.word, isLocked)
                }}
                className={`shrink-0 ${containerWidth} text-left group press-scale snap-card card-stagger`}
                style={{ animationDelay: `${index * 60}ms` }}
                onTouchStart={onLongPressStart ? () => onLongPressStart(video) : undefined}
                onTouchEnd={onLongPressEnd}
                onTouchCancel={onLongPressEnd}
              >
                <div
                  className={`relative ${cardSize} rounded-2xl card-gradient-border genre-tint-${genre.id} flex items-center justify-center magnetic-tilt ${isCardActive ? 'card-now-playing breathing-glow' : ''}`}
                  onPointerMove={onMagneticMove}
                  onPointerLeave={onMagneticLeave}
                >
                  {(genreBackgrounds.length > 0 || fallbackBackgrounds.length > 0) && (
                    <img
                      src={genreBackgrounds.length > 0
                        ? genreBackgrounds[index % genreBackgrounds.length]
                        : fallbackBackgrounds[(index + 15 + genreIndex * 5) % fallbackBackgrounds.length]}
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/20" />

                  {/* Progress ring on active card */}
                  {isCardActive && typeof progressPercent === 'number' && progressPercent > 0 && (
                    <div
                      className="progress-ring-border"
                      style={{ '--progress': `${progressPercent}%` } as React.CSSProperties}
                    />
                  )}

                  {/* Duration badge */}
                  {video.duration && video.duration > 0 && (
                    <span className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] text-white/90 font-medium">
                      {formatDuration(video.duration)}
                    </span>
                  )}

                  {/* Favorite heart */}
                  {onToggleFavorite && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (navigator.vibrate) navigator.vibrate(50)
                        setHeartPopId(video.youtubeId)
                        setTimeout(() => setHeartPopId(null), 350)
                        onToggleFavorite(video)
                      }}
                      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                      className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isFavorited ? 'text-red-500' : 'text-white/60'} ${heartPopId === video.youtubeId ? 'heart-pop' : ''}`}
                        fill={isFavorited ? 'currentColor' : 'none'}
                      />
                    </button>
                  )}

                  <div className={`relative z-10 rounded-full ${tappedCardId === video.id ? 'play-tap' : ''}`}>
                    {isCardActive ? (
                      musicPlaying ? (
                        <div className="eq-bars"><span /><span /><span /></div>
                      ) : (
                        <Pause className="w-8 h-8 text-white drop-shadow-lg icon-morph" fill="white" />
                      )
                    ) : (
                      <Play className="w-8 h-8 text-white/95 group-hover:text-white transition-colors drop-shadow-lg icon-morph" fill="rgba(255,255,255,0.45)" />
                    )}
                  </div>
                  {isLocked && !isCardActive && (
                    <SoftLockBadge isLocked={true} size="md" />
                  )}
                </div>
                <p className="text-sm text-white/95 mt-2 line-clamp-2 leading-tight">{video.title}</p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
