'use client'

import React, { useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { VideoItem, TOPIC_TAGLINES } from './home-types'
import { MediaCard } from './MediaCard'
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
    <div className="mb-10 liquid-reveal section-fade-bg">
      <div className="flex items-center justify-between px-6 mb-5">
        <div className="flex items-center gap-2.5 section-header">
          <div>
            <h2 className="section-header-title parallax-header">
              {topicName}
            </h2>
            <p className="section-header-subtitle">
              {tagline || (TOPIC_TAGLINES[topicName] || 'Motivation')}
            </p>
            <FeatureHint id="home-motivation" text="Swipe to browse — long-press to preview" mode="once" />
          </div>
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
      <div className="flex gap-4 overflow-x-auto px-6 pb-3 scrollbar-hide snap-row lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:gap-5 lg:overflow-visible lg:pb-6">
        {(
          videos.slice(0, 8).map((video, index) => {
            const isLocked = !isContentFree('motivation', index)
            return (
              <MediaCard
                key={video.id}
                video={video}
                image={backgrounds[index % backgrounds.length] ?? null}
                chip={topicName}
                hero={index === 0 && !!heroCard}
                active={activeCardId === video.id}
                playing={musicPlaying}
                tapped={tappedCardId === video.id}
                locked={isLocked}
                favorited={!!favoriteIds?.has(video.youtubeId)}
                heartPop={heartPopId === video.youtubeId}
                progressPercent={progressPercent}
                animationDelay={index * 60}
                onPlay={e => { onRipple(e); onPlay(video, index, isLocked) }}
                onToggleFavorite={onToggleFavorite ? () => {
                  if (navigator.vibrate) navigator.vibrate(50)
                  setHeartPopId(video.youtubeId)
                  setTimeout(() => setHeartPopId(null), 350)
                  onToggleFavorite(video)
                } : undefined}
                onMagneticMove={onMagneticMove}
                onMagneticLeave={onMagneticLeave}
                onLongPressStart={onLongPressStart ? () => onLongPressStart(video) : undefined}
                onLongPressEnd={onLongPressEnd}
              />
            )
          })
        )}
      </div>
      )}
    </div>
  )
}
