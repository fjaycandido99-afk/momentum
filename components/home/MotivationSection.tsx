'use client'

import React, { useState } from 'react'
import { Play, Pause, RefreshCw, Heart, Sparkles } from 'lucide-react'
import { EqBars } from '@/components/ui/EqBars'
import { VideoItem, TOPIC_TAGLINES, formatDuration } from './home-types'
import { SoftLockBadge } from '@/components/premium/SoftLock'
import type { FreemiumContentType } from '@/lib/subscription-constants'
import { SkeletonCardRow } from '@/components/ui/Skeleton'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { EmptyState } from '@/components/ui/EmptyState'

interface MotivationSectionProps {
  videos: VideoItem[]
  loading: boolean
  topicName: string
  backgrounds: string[]
  activeCardId: string | null
  tappedCardId: string | null
  musicPlaying: boolean
  isContentFree: (type: FreemiumContentType, index: number | string) => boolean
  onPlay: (video: VideoItem, index: number, isLocked: boolean) => void
  onMagneticMove: (e: React.PointerEvent<any>) => void
  onMagneticLeave: (e: React.PointerEvent<any>) => void
  onRipple: (e: React.MouseEvent<any>) => void
  tagline?: string
  heroCard?: boolean
  onShuffle?: () => void
  shuffling?: boolean
  favoriteIds?: Set<string>
  onToggleFavorite?: (video: VideoItem) => void
  progressPercent?: number
  onLongPressStart?: (video: VideoItem) => void
  onLongPressEnd?: () => void
}

export function MotivationSection({
  videos, loading, topicName, backgrounds, activeCardId, tappedCardId,
  musicPlaying, isContentFree, onPlay, onMagneticMove, onMagneticLeave, onRipple,
  tagline, heroCard, onShuffle, shuffling, favoriteIds, onToggleFavorite, progressPercent,
  onLongPressStart, onLongPressEnd,
}: MotivationSectionProps) {
  const [heartPopId, setHeartPopId] = useState<string | null>(null)

  return (
    <div className="mb-8 liquid-reveal section-fade-bg">
      <div className="flex items-center justify-between px-6 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white parallax-header">
            {topicName}
          </h2>
          <p className="text-xs text-white/70 mt-0.5">
            {tagline || (TOPIC_TAGLINES[topicName] || 'Motivation')}
          </p>
          <FeatureHint id="home-motivation" text="Swipe to browse — long-press to preview" mode="once" />
        </div>
        {onShuffle && (
          <button
            onClick={onShuffle}
            disabled={shuffling}
            aria-label="Shuffle videos"
            className="p-2 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 active:bg-white/10 transition-colors press-scale"
          >
            <RefreshCw className={`w-4 h-4 text-white/85 ${shuffling ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      {loading ? (
        <SkeletonCardRow heroCard={heroCard} />
      ) : videos.length === 0 ? (
        <div className="px-6">
          <EmptyState
            icon={Sparkles}
            title="No videos yet"
            subtitle="Try refreshing to discover new content"
            action={onShuffle ? { label: 'Refresh', onClick: onShuffle } : undefined}
          />
        </div>
      ) : (
      <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide snap-row">
        {(
          videos.slice(0, 8).map((video, index) => {
            const isLocked = !isContentFree('motivation', index)
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
                  onPlay(video, index, isLocked)
                }}
                className={`shrink-0 ${containerWidth} text-left group press-scale snap-card card-stagger`}
                style={{ animationDelay: `${index * 60}ms` }}
                onTouchStart={onLongPressStart ? () => onLongPressStart(video) : undefined}
                onTouchEnd={onLongPressEnd}
                onTouchCancel={onLongPressEnd}
              >
                <div
                  className={`relative ${cardSize} rounded-2xl card-gradient-border flex items-center justify-center magnetic-tilt ${isCardActive ? 'card-now-playing breathing-glow' : ''}`}
                  onPointerMove={onMagneticMove}
                  onPointerLeave={onMagneticLeave}
                >
                  <img
                    src={backgrounds[index % backgrounds.length]}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-70 transition-opacity"
                  />
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
                      className="absolute top-2 right-2 z-10 p-2.5 rounded-full bg-black/40 hover:bg-black/60 active:bg-black/60 transition-colors"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isFavorited ? 'text-red-500' : 'text-white/75'} ${heartPopId === video.youtubeId ? 'heart-pop' : ''}`}
                        fill={isFavorited ? 'currentColor' : 'none'}
                      />
                    </button>
                  )}

                  <div className={`relative z-10 rounded-full ${tappedCardId === video.id ? 'play-tap' : ''}`}>
                    {isCardActive ? (
                      musicPlaying ? (
                        <EqBars />
                      ) : (
                        <Pause className="w-8 h-8 text-white drop-shadow-lg icon-morph" fill="white" />
                      )
                    ) : (
                      <Play className="w-8 h-8 text-white drop-shadow-lg icon-morph" fill="rgba(255,255,255,0.45)" />
                    )}
                  </div>
                  {isLocked && !isCardActive && (
                    <SoftLockBadge isLocked={true} size="md" />
                  )}
                </div>
                <p className="text-sm text-white/70 mt-2 line-clamp-2 leading-tight">{video.title}</p>
              </button>
            )
          })
        )}
      </div>
      )}
    </div>
  )
}
