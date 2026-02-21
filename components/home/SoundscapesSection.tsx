'use client'

import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { SoftLockBadge } from '@/components/premium/SoftLock'
import { getSoundscapeBackground } from './home-types'
import { Layers } from 'lucide-react'
import { EqBars, SoundscapeEqBars } from '@/components/ui/EqBars'
import type { FreemiumContentType } from '@/lib/subscription-constants'

interface SoundscapesSectionProps {
  activeSoundscape: { soundId: string; label: string; subtitle: string; youtubeId: string } | null
  soundscapeIsPlaying: boolean
  isContentFree: (type: FreemiumContentType, id: number | string) => boolean
  onPlay: (item: typeof SOUNDSCAPE_ITEMS[number], isLocked: boolean) => void
  onReopen: (soundId: string) => void
  onOpenMixer?: () => void
}

export function SoundscapesSection({ activeSoundscape, soundscapeIsPlaying, isContentFree, onPlay, onReopen, onOpenMixer }: SoundscapesSectionProps) {
  return (
    <div className="mb-8 liquid-reveal section-fade-bg">
      <h2 className="text-lg font-semibold text-white px-6 mb-4 parallax-header section-heading-reveal flex items-center gap-2">
        Soundscapes
        {activeSoundscape && soundscapeIsPlaying && (
          <SoundscapeEqBars />
        )}
        {onOpenMixer && (
          <button onClick={onOpenMixer} aria-label="Open ambient mixer" className="ml-auto p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.12] transition-colors press-scale">
            <Layers className="w-4 h-4 text-white/60" />
          </button>
        )}
      </h2>
      <div className="px-6"><FeatureHint id="home-soundscapes" text="Tap to play ambient sounds — they continue in the background" mode="once" /></div>
      <div className="flex gap-4 overflow-x-auto px-6 pt-2 pb-4 scrollbar-hide snap-row">
        {SOUNDSCAPE_ITEMS.map((item, index) => {
          const Icon = item.icon
          const isActive = activeSoundscape?.soundId === item.id && soundscapeIsPlaying
          const isLocked = !isContentFree('soundscape', item.id)

          return (
            <button
              key={item.id}
              aria-label={`${item.label} soundscape${isActive ? ' (playing)' : ''}${isLocked ? ' (premium)' : ''}`}
              onClick={() => {
                if (activeSoundscape?.soundId === item.id) {
                  onReopen(item.id)
                  return
                }
                onPlay(item, isLocked)
              }}
              className="flex flex-col items-center gap-1.5 shrink-0 press-scale snap-card card-stagger"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className={`relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-200 bg-black border border-white/[0.12] ${isActive ? 'card-now-playing breathing-glow' : ''}`}>
                {(() => {
                  const bg = getSoundscapeBackground(item.id)
                  return bg ? (
                    <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  ) : null
                })()}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />
                <div className="relative z-10">
                  {isActive ? (
                    <EqBars />
                  ) : (
                    <Icon className="w-6 h-6 text-white drop-shadow-md" strokeWidth={1.5} />
                  )}
                </div>
                {isLocked && !isActive && (
                  <SoftLockBadge isLocked={true} size="sm" className="top-0 right-0" />
                )}
              </div>
              <span className={`text-[11px] ${isActive ? 'text-white' : 'text-white/80'}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
