'use client'

import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { SoftLockBadge } from '@/components/premium/SoftLock'
import type { FreemiumContentType } from '@/lib/subscription-constants'

interface SoundscapesSectionProps {
  activeSoundscape: { soundId: string; label: string; subtitle: string; youtubeId: string } | null
  soundscapeIsPlaying: boolean
  isContentFree: (type: FreemiumContentType, id: number | string) => boolean
  onPlay: (item: typeof SOUNDSCAPE_ITEMS[number], isLocked: boolean) => void
  onReopen: (soundId: string) => void
}

export function SoundscapesSection({ activeSoundscape, soundscapeIsPlaying, isContentFree, onPlay, onReopen }: SoundscapesSectionProps) {
  return (
    <div className="mb-8 liquid-reveal section-fade-bg">
      <h2 className="text-lg font-semibold text-white px-6 mb-4 parallax-header section-heading-reveal flex items-center gap-2">
        Soundscapes
        {activeSoundscape && soundscapeIsPlaying && (
          <span className="inline-flex items-end gap-[2px] h-[12px] text-white/75">
            <span className="soundscape-eq-bar" />
            <span className="soundscape-eq-bar" />
            <span className="soundscape-eq-bar" />
          </span>
        )}
      </h2>
      <div className="px-6"><FeatureHint id="home-soundscapes" text="Tap to play ambient sounds — they continue in the background" mode="once" /></div>
      <div className="flex gap-4 overflow-x-auto px-6 pt-2 pb-4 scrollbar-hide snap-row">
        {SOUNDSCAPE_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeSoundscape?.soundId === item.id && soundscapeIsPlaying
          const isLocked = !isContentFree('soundscape', item.id)

          return (
            <button
              key={item.id}
              aria-label={`${item.label} soundscape${isActive ? ' (playing)' : ''}${isLocked ? ' (premium)' : ''}`}
              onPointerUp={(e) => {
                if (e.pointerType !== 'touch') return
                if (activeSoundscape?.soundId === item.id) {
                  onReopen(item.id)
                  return
                }
                onPlay(item, isLocked)
              }}
              className="flex flex-col items-center gap-2 shrink-0 press-scale snap-card"
            >
              <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 bg-black border border-white/[0.12] ${isActive ? 'card-now-playing breathing-glow' : ''}`}>
                {isActive ? (
                  <div className="eq-bars"><span /><span /><span /></div>
                ) : (
                  <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                )}
                {isLocked && !isActive && (
                  <SoftLockBadge isLocked={true} size="sm" className="top-0 right-0" />
                )}
              </div>
              <span className={`text-[11px] ${isActive ? 'text-white' : 'text-white'}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
