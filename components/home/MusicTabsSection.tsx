'use client'

import React, { useState, useEffect, useRef } from 'react'
import { LazyGenreSection } from './LazyGenreSection'
import type { VideoItem } from './home-types'
import type { FreemiumContentType } from '@/lib/subscription-constants'

interface MusicTabsSectionProps {
  genres: { id: string; word: string; tagline: string }[]
  currentPlayingGenreId: string | undefined
  fallbackBackgrounds: string[]
  audioState: {
    activeCardId: string | null
    tappedCardId: string | null
    musicPlaying: boolean
    currentPlaylist: {
      type: 'motivation' | 'music'
      genreId?: string
    } | null
    musicDuration: number
    musicCurrentTime: number
  }
  isContentFree: (type: FreemiumContentType, index: number | string) => boolean
  onPlay: (video: VideoItem, index: number, genreId: string, genreWord: string, isLocked: boolean) => void
  onMagneticMove: (e: React.PointerEvent<any>) => void
  onMagneticLeave: (e: React.PointerEvent<any>) => void
  onRipple: (e: React.MouseEvent<any>) => void
  favoriteIds: Set<string>
  onToggleFavorite: (video: VideoItem) => void
  onLongPressStart: (video: VideoItem) => void
  onLongPressEnd: () => void
  showShuffleToast: (message: string) => void
  onDataLoaded: (genreId: string, videos: VideoItem[], backgrounds: string[]) => void
}

export function MusicTabsSection({
  genres,
  currentPlayingGenreId,
  fallbackBackgrounds,
  audioState,
  isContentFree,
  onPlay,
  onMagneticMove,
  onMagneticLeave,
  onRipple,
  favoriteIds,
  onToggleFavorite,
  onLongPressStart,
  onLongPressEnd,
  showShuffleToast,
  onDataLoaded,
}: MusicTabsSectionProps) {
  const [selectedGenreId, setSelectedGenreId] = useState(genres[0]?.id ?? 'lofi')
  const pillsRef = useRef<HTMLDivElement>(null)

  // Auto-select the genre that's currently playing
  useEffect(() => {
    if (currentPlayingGenreId) {
      setSelectedGenreId(currentPlayingGenreId)
    }
  }, [currentPlayingGenreId])

  // Scroll the active pill into view
  useEffect(() => {
    if (!pillsRef.current) return
    const active = pillsRef.current.querySelector('[data-active="true"]') as HTMLElement | null
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [selectedGenreId])

  const selectedGenre = genres.find(g => g.id === selectedGenreId) ?? genres[0]
  const selectedGenreIndex = genres.findIndex(g => g.id === selectedGenreId)

  const progressPercent =
    audioState.currentPlaylist?.type === 'music' &&
    audioState.currentPlaylist?.genreId === selectedGenreId &&
    audioState.musicDuration > 0
      ? (audioState.musicCurrentTime / audioState.musicDuration) * 100
      : undefined

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-6 mb-5">
        <div className="flex items-center gap-2.5 section-header">
          <div>
            <h2 className="section-header-title">Music</h2>
            <p className="section-header-subtitle">Background music for your flow</p>
          </div>
        </div>
      </div>

      {/* Genre pills */}
      <div
        ref={pillsRef}
        className="flex gap-2 overflow-x-auto px-6 pb-4 scrollbar-hide"
      >
        {genres.map(g => {
          const isActive = g.id === selectedGenreId
          return (
            <button
              key={g.id}
              data-active={isActive}
              onClick={() => setSelectedGenreId(g.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-white text-black font-medium'
                  : 'bg-black border border-white/15 text-white/70'
              }`}
            >
              {g.word}
            </button>
          )
        })}
      </div>

      {/* Selected genre content */}
      <LazyGenreSection
        key={selectedGenre.id}
        genre={selectedGenre}
        genreIndex={selectedGenreIndex}
        fallbackBackgrounds={fallbackBackgrounds}
        activeCardId={audioState.activeCardId}
        tappedCardId={audioState.tappedCardId}
        musicPlaying={audioState.musicPlaying}
        isContentFree={isContentFree}
        onPlay={onPlay}
        onMagneticMove={onMagneticMove}
        onMagneticLeave={onMagneticLeave}
        onRipple={onRipple}
        heroCard={true}
        favoriteIds={favoriteIds}
        onToggleFavorite={onToggleFavorite}
        progressPercent={progressPercent}
        onLongPressStart={onLongPressStart}
        onLongPressEnd={onLongPressEnd}
        showShuffleToast={showShuffleToast}
        onDataLoaded={onDataLoaded}
      />
    </div>
  )
}
