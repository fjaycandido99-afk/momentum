'use client'

import { Loader2 } from 'lucide-react'
import { VOICE_GUIDES } from './home-types'
import { SoftLockBadge } from '@/components/premium/SoftLock'
import type { FreemiumContentType } from '@/lib/subscription-constants'

interface GuidedSectionProps {
  guideLabel: string | null
  guideIsPlaying: boolean
  loadingGuide: string | null
  isContentFree: (type: FreemiumContentType, id: number | string) => boolean
  onPlay: (guideId: string, name: string, isLocked: boolean) => void
}

export function GuidedSection({ guideLabel, guideIsPlaying, loadingGuide, isContentFree, onPlay }: GuidedSectionProps) {
  return (
    <div className="mb-8 liquid-reveal section-fade-bg">
      <h2 className="text-lg font-semibold text-white px-6 mb-4 parallax-header">Guided</h2>
      <div className="flex justify-evenly px-2 pb-2">
        {VOICE_GUIDES.map((guide) => {
          const Icon = guide.icon
          const isLoading = loadingGuide === guide.id
          const isGuideActive = guideLabel === guide.name && guideIsPlaying
          const isLocked = !isContentFree('voiceGuide', guide.id)

          return (
            <button
              key={guide.id}
              aria-label={`${guide.name} guide${isGuideActive ? ' (playing)' : isLoading ? ' (loading)' : ''}${isLocked ? ' (premium)' : ''}`}
              onClick={() => onPlay(guide.id, guide.name, isLocked)}
              disabled={isLoading}
              className="flex flex-col items-center gap-2 press-scale"
            >
              <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 card-gradient-border-round ${isLoading ? 'bg-white/8' : ''} ${isGuideActive ? 'card-now-playing breathing-glow' : ''}`}>
                {isLoading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : isGuideActive ? (
                  <div className="eq-bars"><span /><span /><span /></div>
                ) : (
                  <Icon
                    className="w-6 h-6 text-white transition-colors duration-200"
                    strokeWidth={1.5}
                  />
                )}
                {isLocked && !isGuideActive && !isLoading && (
                  <SoftLockBadge isLocked={true} size="sm" className="top-0 right-0" />
                )}
              </div>
              <span className={`text-[11px] ${isGuideActive ? 'text-white' : 'text-white'}`}>{guide.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
