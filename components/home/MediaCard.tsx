'use client'

import React from 'react'
import { Heart, Pause, Play } from 'lucide-react'
import { EqBars } from '@/components/ui/EqBars'
import { SoftLockBadge } from '@/components/premium/SoftLock'
import { formatDuration, type VideoItem } from './home-types'

/**
 * One tile in Home's music and motivation rows — the mockup's card: the
 * picture with a glass play button, its length and a heart; under it a chip,
 * the title in white and the rest of it in blue.
 *
 * Both rows used to carry their own copy of this markup, line for line.
 *
 * The chip is the row's own label (the genre, the topic) — the only tag we
 * actually know about a video. The mockup's "LOFI · HIP HOP · FOCUS" would
 * have to be guessed from the title, and a guessed tag is invented data.
 */

/** "Stop Getting Distracted | Motivational Video" → title + the rest. */
export function splitTitle(title: string): { main: string; rest: string | null } {
  const m = title.match(/^(.+?)\s+(?:\||-|–|—|:)\s+(.+)$/)
  if (!m) return { main: title.trim(), rest: null }
  return { main: m[1].trim(), rest: m[2].trim() }
}

export function MediaCard({
  video,
  image,
  chip,
  hero,
  active,
  playing,
  tapped,
  locked,
  favorited,
  heartPop,
  progressPercent,
  animationDelay,
  onPlay,
  onToggleFavorite,
  onMagneticMove,
  onMagneticLeave,
  onLongPressStart,
  onLongPressEnd,
}: {
  video: VideoItem
  image: string | null
  chip: string
  hero: boolean
  active: boolean
  playing: boolean
  tapped: boolean
  locked: boolean
  favorited: boolean
  heartPop: boolean
  progressPercent?: number
  animationDelay: number
  onPlay: (e: React.MouseEvent<HTMLButtonElement>) => void
  onToggleFavorite?: () => void
  onMagneticMove: (e: React.PointerEvent<HTMLDivElement>) => void
  onMagneticLeave: (e: React.PointerEvent<HTMLDivElement>) => void
  onLongPressStart?: () => void
  onLongPressEnd?: () => void
}) {
  const { main, rest } = splitTitle(video.title)
  // Landscape-ish tiles, like the mockup — the first card in a row is larger.
  const width = hero ? 'w-60' : 'w-44'

  return (
    <button
      aria-label={`Play ${video.title}${locked ? ' (premium)' : ''}`}
      onClick={onPlay}
      className={`shrink-0 ${width} text-left group press-scale snap-card card-stagger`}
      style={{ animationDelay: `${animationDelay}ms` }}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onTouchCancel={onLongPressEnd}
    >
      <div
        className={`relative w-full aspect-[5/4] rounded-[20px] card-surface overflow-hidden magnetic-tilt ${
          active ? 'card-now-playing scene-selected' : ''
        }`}
        onPointerMove={onMagneticMove}
        onPointerLeave={onMagneticLeave}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="scene-photo absolute inset-0 w-full h-full object-cover opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15" />

        {active && typeof progressPercent === 'number' && progressPercent > 0 && (
          <div className="progress-ring-border" style={{ '--progress': `${progressPercent}%` } as React.CSSProperties} />
        )}

        {onToggleFavorite && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onToggleFavorite() }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggleFavorite() } }}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            className="absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full bg-black/45 border border-white/15 backdrop-blur-sm flex items-center justify-center"
          >
            <Heart
              className={`w-4 h-4 ${favorited ? 'text-red-500' : 'text-white/85'} ${heartPop ? 'heart-pop' : ''}`}
              fill={favorited ? 'currentColor' : 'none'}
            />
          </span>
        )}

        {/* The play button: glass, bottom-left, as in the mockup. */}
        <span
          className={`absolute bottom-2.5 left-2.5 z-10 w-11 h-11 rounded-full bg-black/35 border border-white/70 backdrop-blur-sm flex items-center justify-center ${
            tapped ? 'play-tap' : ''
          }`}
          aria-hidden
        >
          {active ? (
            playing ? <EqBars height={14} barWidth={3} gap={2} barCount={3} /> : <Pause className="w-4 h-4 text-white" fill="white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
          )}
        </span>

        {video.duration && video.duration > 0 ? (
          <span className="absolute bottom-3 right-2.5 z-10 px-2.5 py-1 rounded-full bg-black/60 border border-white/15 text-px-11 text-white font-medium tabular-nums">
            {formatDuration(video.duration)}
          </span>
        ) : null}

        {locked && !active && <SoftLockBadge isLocked={true} size="md" />}
      </div>

      <span className="inline-block mt-2.5 rounded-full border border-white/20 px-2.5 py-0.5 text-px-10 uppercase tracking-[0.12em] text-white/80">
        {chip}
      </span>
      <p className="text-px-15 font-semibold text-white mt-1.5 leading-snug line-clamp-2">{main}</p>
      {rest && <p className="text-px-13 text-[#8ea6ff] mt-0.5 leading-snug line-clamp-1">{rest}</p>}
    </button>
  )
}
