'use client'

import React, { useState } from 'react'
import { Music, RefreshCw } from 'lucide-react'
import { VideoItem, getGenreBackgrounds } from './home-types'
import { MediaCard } from './MediaCard'
import type { FreemiumContentType } from '@/lib/subscription-constants'
import { SkeletonCardRow } from '@/components/ui/Skeleton'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { EmptyState } from '@/components/ui/EmptyState'

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
    <div className="mb-10 liquid-reveal section-fade-bg">
      <div className="flex items-center justify-between px-6 mb-5">
        <div className="flex items-center gap-2.5 section-header">
          <div>
            <h2 className="section-header-title parallax-header">{genre.word}</h2>
            <p className="section-header-subtitle">{genre.tagline}</p>
            {genreIndex === 0 && <FeatureHint id="home-music-genre" text="Music plays in the background — shuffle for fresh picks" mode="once" />}
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
        <div className="px-2"><SkeletonCardRow heroCard={heroCard} /></div>
      ) : videos.length === 0 ? (
        <div className="px-6">
          <EmptyState
            icon={Music}
            title="No tracks yet"
            subtitle="Check back soon for new music"
            action={onShuffle ? { label: 'Refresh', onClick: onShuffle } : undefined}
          />
        </div>
      ) : (
      <div className="flex gap-4 overflow-x-auto px-6 pb-3 scrollbar-hide snap-row lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:gap-5 lg:overflow-visible lg:pb-6">
        {(
          videos.slice(0, 8).map((video, index) => {
            const isLocked = !isContentFree('music', index)
            return (
              <MediaCard
                key={video.id}
                video={video}
                image={(() => {
                const bgs = genreBackgrounds.length > 0 ? genreBackgrounds : (getGenreBackgrounds(genre.id) || [])
                return bgs.length > 0 ? bgs[index % bgs.length] : (fallbackBackgrounds.length > 0 ? fallbackBackgrounds[(index + 15 + genreIndex * 5) % fallbackBackgrounds.length] : null)
              })()}
                chip={genre.word}
                hero={index === 0 && !!heroCard}
                active={activeCardId === video.id}
                playing={musicPlaying}
                tapped={tappedCardId === video.id}
                locked={isLocked}
                favorited={!!favoriteIds?.has(video.youtubeId)}
                heartPop={heartPopId === video.youtubeId}
                progressPercent={progressPercent}
                animationDelay={index * 60}
                onPlay={e => { onRipple(e); onPlay(video, index, genre.id, genre.word, isLocked) }}
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
