'use client'

import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import { AuraRing } from '@/components/ui/Aura'
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
    <div className="mb-10 liquid-reveal section-fade-bg">
      <div className="flex items-center justify-between px-6 mb-5">
        <div className="flex items-center gap-2.5 section-header">
          <div>
            <h2 className="section-header-title parallax-header">Soundscapes</h2>
            <p className="section-header-subtitle">Ambient sounds for focus & calm</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeSoundscape && soundscapeIsPlaying && (
            <SoundscapeEqBars />
          )}
          {onOpenMixer && (
            <button onClick={onOpenMixer} aria-label="Open ambient mixer" className="p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.12] active:bg-white/[0.12] transition-colors press-scale">
              <Layers className="w-4 h-4 text-white/60" />
            </button>
          )}
        </div>
      </div>
      <div className="px-6"><FeatureHint id="home-soundscapes" text="Tap to play ambient sounds — they continue in the background" mode="once" /></div>
      {/* Mobile: horizontal scroll strip (thumb-swipe + small viewport).
          Desktop: wrap into a multi-column grid so 17 portals don't read
          as an endless ribbon trailing off the canvas. justify-items-center
          + gap-y so each tile sits centered in its column with breathing
          room above/below. */}
      <div className="flex gap-4 overflow-x-auto px-6 pt-1 pb-3 scrollbar-hide snap-row lg:grid lg:grid-cols-7 xl:grid-cols-9 lg:gap-x-4 lg:gap-y-7 lg:overflow-visible lg:justify-items-center lg:pt-4 lg:pb-6">
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
              <div className="relative grid place-items-center" style={{ width: 64, height: 64 }}>
                {/* Full-color image inside the monochrome ring — the imagery is
                    the pop of color. A soft center scrim keeps the icon legible. */}
                {(() => {
                  const bg = getSoundscapeBackground(item.id)
                  return bg ? (
                    <div className="absolute rounded-full overflow-hidden" style={{ width: 56, height: 56 }}>
                      <img src={bg} alt="" className="w-full h-full object-cover" />
                      <div
                        className="absolute inset-0"
                        style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)' }}
                      />
                    </div>
                  ) : null
                })()}
                {/* Signature aura ring — always breathes so the grid reads
                    as a row of living portals, not stickers. Idle = slow +
                    subtle, active = energetic + faster orbit. */}
                <div className="absolute inset-0 grid place-items-center">
                  <AuraRing size={64} stroke={1.5} state={isActive ? 'active' : 'idle'} breathe />
                </div>
                {/* Center icon / playing bars */}
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
              <span className={`text-[11px] ${isActive ? 'text-white' : 'text-white/90'}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
