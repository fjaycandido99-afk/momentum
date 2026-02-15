'use client'

import { Play, Pause, Share2 } from 'lucide-react'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { useShareCard } from '@/hooks/useShareCard'
import { generateListeningCard } from '@/hooks/useShareCardTemplates'

type Mode = 'focus' | 'relax' | 'sleep' | 'energy'

const MODE_LABELS: Record<Mode, string> = {
  focus: 'Focus',
  relax: 'Relax',
  sleep: 'Sleep',
  energy: 'Energy',
}

interface BottomPlayerBarProps {
  mode: Mode
  isPlaying: boolean
  onTogglePlay: () => void
  onOpenPlayer: () => void
  label?: string // Override subtitle (e.g. guide name)
  nextTrackTitle?: string
  playlistPosition?: string // e.g. "2 of 8"
}

export function BottomPlayerBar({ mode, isPlaying, onTogglePlay, onOpenPlayer, label, nextTrackTitle, playlistPosition }: BottomPlayerBarProps) {
  const displayLabel = label || MODE_LABELS[mode]
  const { shareFromHTML, isGenerating } = useShareCard()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 safe-area-pb">
      {/* Main bar */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Now playing: ${displayLabel}. ${isPlaying ? 'Playing' : 'Paused'}. Tap to open player.`}
        className="mx-4 mb-2 flex items-center justify-between px-4 py-3 rounded-full glass-refined glass-elevated cursor-pointer focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        onClick={onOpenPlayer}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenPlayer() } }}
      >
        {/* Left: sound bars icon + text */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 shrink-0 rounded-full border border-white/20 flex items-center justify-center">
            {/* Sound wave bars */}
            <div className="flex items-end gap-[2px] w-4 h-4">
              <div className={`w-[2.5px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-1' : 'h-1.5'}`} />
              <div className={`w-[2.5px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-2' : 'h-2.5'}`} />
              <div className={`w-[2.5px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-3' : 'h-1'}`} />
              <div className={`w-[2.5px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-4' : 'h-2'}`} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white leading-tight truncate">
                {isPlaying ? 'Playing' : 'Paused'}
              </p>
              {playlistPosition && (
                <span className="text-[10px] text-white/40 font-medium shrink-0">{playlistPosition}</span>
              )}
            </div>
            <p className="text-xs text-white/95 leading-tight truncate">{displayLabel}</p>
            <FeatureHint id="home-player-bar" text="Tap the title to open full player" mode="once" />
            {nextTrackTitle && isPlaying && (
              <p className="text-[10px] text-white/40 leading-tight truncate mt-0.5">
                Up next: {nextTrackTitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: share + play/pause */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {label && (
            <button
              aria-label="Share what's playing"
              onClick={(e) => { e.stopPropagation(); shareFromHTML(generateListeningCard(displayLabel, 0)) }}
              disabled={isGenerating}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors press-scale disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5 text-white/70" />
            </button>
          )}
          <button
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={(e) => { e.stopPropagation(); onTogglePlay() }}
            className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-white/40 transition-colors press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            {isPlaying ? (
              <Pause className="w-[18px] h-[18px] text-white" fill="white" />
            ) : (
              <Play className="w-[18px] h-[18px] text-white ml-0.5" fill="white" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
