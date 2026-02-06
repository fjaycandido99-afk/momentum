'use client'

import React from 'react'
import { Play, Pause } from 'lucide-react'
import { VideoItem, TOPIC_TAGLINES } from './home-types'
import { SoftLockBadge } from '@/components/premium/SoftLock'
import type { FreemiumContentType } from '@/lib/subscription-constants'

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
}

export function MotivationSection({
  videos, loading, topicName, backgrounds, activeCardId, tappedCardId,
  musicPlaying, isContentFree, onPlay, onMagneticMove, onMagneticLeave, onRipple,
}: MotivationSectionProps) {
  return (
    <div className="mb-8 scroll-reveal section-fade-bg">
      <div className="flex items-center justify-between px-6 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white parallax-header">Motivation</h2>
          <p className="text-xs text-white/95 mt-0.5">{topicName} &middot; {TOPIC_TAGLINES[topicName]}</p>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-40">
              <div className="w-40 h-40 rounded-2xl card-gradient-border skeleton-shimmer" />
              <div className="h-3 bg-[#111113] rounded mt-2 w-3/4" />
              <div className="h-2 bg-[#111113] rounded mt-1.5 w-1/2" />
            </div>
          ))
        ) : (
          videos.slice(0, 8).map((video, index) => {
            const isLocked = !isContentFree('motivation', index)
            const isCardActive = activeCardId === video.id

            return (
              <button
                key={video.id}
                aria-label={`Play ${video.title}${isLocked ? ' (premium)' : ''}`}
                onClick={(e) => {
                  onRipple(e)
                  onPlay(video, index, isLocked)
                }}
                className="shrink-0 w-40 text-left group press-scale"
              >
                <div
                  className={`relative w-40 h-40 rounded-2xl card-gradient-border flex items-center justify-center magnetic-tilt ${isCardActive ? 'card-now-playing breathing-glow' : ''}`}
                  onPointerMove={onMagneticMove}
                  onPointerLeave={onMagneticLeave}
                >
                  <img
                    src={backgrounds[index % backgrounds.length]}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/20" />
                  <div className={`relative z-10 rounded-full ${tappedCardId === video.id ? 'play-tap' : ''}`}>
                    {isCardActive ? (
                      musicPlaying ? (
                        <div className="eq-bars"><span /><span /><span /></div>
                      ) : (
                        <Pause className="w-8 h-8 text-white drop-shadow-lg icon-morph" fill="white" />
                      )
                    ) : (
                      <Play className="w-8 h-8 text-white/95 group-hover:text-white transition-colors drop-shadow-lg icon-morph" fill="rgba(255,255,255,0.45)" />
                    )}
                  </div>
                  {isLocked && !isCardActive && (
                    <SoftLockBadge isLocked={true} size="md" />
                  )}
                </div>
                <p className="text-sm text-white/95 mt-2 line-clamp-2 leading-tight">{video.title}</p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
