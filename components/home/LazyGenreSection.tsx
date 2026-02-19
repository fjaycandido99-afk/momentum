'use client'

import React, { useRef, useCallback, useState } from 'react'
import { MusicGenreSection } from './MusicGenreSection'
import { SkeletonCardRow } from '@/components/ui/Skeleton'
import { useLazySection } from '@/hooks/useLazySection'
import { useGenreVideos, useGenreBackgrounds } from '@/hooks/useHomeSWR'
import { shuffleWithSeed, type VideoItem } from './home-types'
import type { FreemiumContentType } from '@/lib/subscription-constants'

interface LazyGenreSectionProps {
  genre: { id: string; word: string; tagline: string }
  genreIndex: number
  fallbackBackgrounds: string[]
  activeCardId: string | null
  tappedCardId: string | null
  musicPlaying: boolean
  isContentFree: (type: FreemiumContentType, index: number | string) => boolean
  onPlay: (video: VideoItem, index: number, genreId: string, genreWord: string, isLocked: boolean) => void
  onMagneticMove: (e: React.PointerEvent<any>) => void
  onMagneticLeave: (e: React.PointerEvent<any>) => void
  onRipple: (e: React.MouseEvent<any>) => void
  heroCard?: boolean
  favoriteIds?: Set<string>
  onToggleFavorite?: (video: VideoItem) => void
  progressPercent?: number
  onLongPressStart?: (video: VideoItem) => void
  onLongPressEnd?: () => void
  showShuffleToast: (message: string) => void
  // Expose data for restore logic
  onDataLoaded?: (genreId: string, videos: VideoItem[], backgrounds: string[]) => void
}

export function LazyGenreSection({
  genre,
  genreIndex,
  fallbackBackgrounds,
  activeCardId,
  tappedCardId,
  musicPlaying,
  isContentFree,
  onPlay,
  onMagneticMove,
  onMagneticLeave,
  onRipple,
  heroCard,
  favoriteIds,
  onToggleFavorite,
  progressPercent,
  onLongPressStart,
  onLongPressEnd,
  showShuffleToast,
  onDataLoaded,
}: LazyGenreSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const isVisible = useLazySection(sectionRef)

  const { genreVideos: videos, genreLoading, mutateGenre } = useGenreVideos(genre.id, isVisible)
  const { genreBackgrounds: rawBgs } = useGenreBackgrounds(genre.id, isVisible)

  // Shuffle backgrounds with daily seed
  const shuffledBgs = React.useMemo(() => {
    if (rawBgs.length === 0) return []
    const now = new Date()
    const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
    const genreSeed = genre.id.split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0)
    return shuffleWithSeed(rawBgs, genreSeed + dateSeed)
  }, [rawBgs, genre.id])

  // Notify parent when data loads (for restore logic)
  const hasNotifiedRef = useRef(false)
  React.useEffect(() => {
    if (videos.length > 0 && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true
      onDataLoaded?.(genre.id, videos, shuffledBgs)
    }
  }, [videos, shuffledBgs, genre.id, onDataLoaded])

  const [shuffling, setShuffling] = useState(false)
  const handleShuffle = useCallback(async () => {
    setShuffling(true)
    try {
      const seed = Date.now()
      const res = await fetch(`/api/music-videos?genre=${genre.id}&shuffle=true&seed=${seed}`)
      const data = res.ok ? await res.json() : { videos: [] }
      const vids = data.videos || []
      mutateGenre({ videos: vids }, false)
      if (vids.length > 0) showShuffleToast(`Shuffled ${vids.length} tracks`)
    } catch {}
    setShuffling(false)
  }, [genre.id, mutateGenre, showShuffleToast])

  const loading = !isVisible || genreLoading

  return (
    <div ref={sectionRef}>
      {!isVisible ? (
        <div className="mb-12 liquid-reveal section-fade-bg">
          <div className="flex items-center px-8 mb-4">
            <div>
              <h2 className={`text-lg font-semibold text-white parallax-header genre-accent-${genre.id}`}>{genre.word}</h2>
              <p className="text-xs text-white/70 mt-0.5">{genre.tagline}</p>
            </div>
          </div>
          <div className="px-2"><SkeletonCardRow heroCard={heroCard} /></div>
        </div>
      ) : (
        <MusicGenreSection
          genre={genre}
          videos={videos}
          genreBackgrounds={shuffledBgs}
          fallbackBackgrounds={fallbackBackgrounds}
          genreIndex={genreIndex}
          loading={loading}
          activeCardId={activeCardId}
          tappedCardId={tappedCardId}
          musicPlaying={musicPlaying}
          isContentFree={isContentFree}
          onPlay={onPlay}
          onMagneticMove={onMagneticMove}
          onMagneticLeave={onMagneticLeave}
          onRipple={onRipple}
          heroCard={heroCard}
          onShuffle={handleShuffle}
          shuffling={shuffling}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
          progressPercent={progressPercent}
          onLongPressStart={onLongPressStart}
          onLongPressEnd={onLongPressEnd}
        />
      )}
    </div>
  )
}
