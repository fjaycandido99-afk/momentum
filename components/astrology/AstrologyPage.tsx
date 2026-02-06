'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Music, Play, Star, Orbit } from 'lucide-react'
import { ZodiacIdentityCard } from './ZodiacIdentityCard'
import { MoonPhaseWidget } from './MoonPhaseWidget'
import { ZodiacAffirmations } from './ZodiacAffirmations'
import { CompatibilitySnapshot } from './CompatibilitySnapshot'
import { CosmicInsightCard } from '@/components/daily-guide/CosmicInsightCard'

const WordAnimationPlayer = dynamic(
  () => import('@/components/player/WordAnimationPlayer').then(mod => mod.WordAnimationPlayer),
  { ssr: false }
)

interface Preferences {
  astrology_enabled?: boolean
  zodiac_sign?: string | null
}

const COSMIC_SOUNDS = [
  { id: 'cosmic', word: 'Cosmic', icon: Music, color: 'from-indigo-500/[0.08] to-purple-500/[0.04]', youtubeId: 'Os5L24RamnM' },
  { id: 'astral', word: 'Astral', icon: Orbit, color: 'from-indigo-500/[0.08] to-purple-500/[0.04]', youtubeId: 'oKTj0bfn0oc' },
  { id: 'starlight', word: 'Starlight', icon: Star, color: 'from-indigo-500/[0.08] to-purple-500/[0.04]', youtubeId: '5dhxKwr6G5c' },
]

export function AstrologyPage() {
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [playingSound, setPlayingSound] = useState<typeof COSMIC_SOUNDS[0] | null>(null)

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/daily-guide/preferences', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setPreferences(data)
        }
      } catch (error) {
        console.error('Failed to load preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadPreferences()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen text-white px-6 py-12">
        <div className="mb-8 animate-fade-in-down header-fade-bg">
          <h1 className="text-2xl font-semibold shimmer-text">Cosmic Guide</h1>
          <p className="text-white/95 text-sm mt-1">Loading your cosmic profile...</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl card-cosmic skeleton-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  const zodiacSign = preferences?.zodiac_sign || null

  return (
    <div className="min-h-screen text-white px-6 py-12">
      {/* Cosmic Sound Player overlay */}
      {playingSound && (
        <WordAnimationPlayer
          word={playingSound.word}
          script=""
          color={playingSound.color}
          youtubeId={playingSound.youtubeId}
          showConstellation
          onClose={() => setPlayingSound(null)}
        />
      )}

      {/* Header */}
      <div className="mb-8 animate-fade-in-down header-fade-bg">
        <h1 className="text-2xl font-semibold shimmer-text">Cosmic Guide</h1>
        <p className="text-white/95 text-sm mt-1">Your daily cosmic alignment</p>
      </div>

      {/* Zodiac Identity Card */}
      <div className="mb-5 animate-fade-in section-fade-bg" style={{ animationDelay: '0.05s' }}>
        <ZodiacIdentityCard zodiacSign={zodiacSign} />
      </div>

      {/* Moon Phase Widget */}
      <div className="mb-5 animate-fade-in section-fade-bg" style={{ animationDelay: '0.1s' }}>
        <MoonPhaseWidget />
      </div>

      {/* Today's Cosmic Insight (reuse existing component) */}
      {zodiacSign && (
        <div className="mb-5 animate-fade-in section-fade-bg" style={{ animationDelay: '0.15s' }}>
          <CosmicInsightCard
            isCompleted={false}
            zodiacSign={zodiacSign}
            onComplete={() => {}}
            variant="cosmic"
          />
        </div>
      )}

      {/* Zodiac-Tuned Affirmations */}
      <div className="mb-5 animate-fade-in section-fade-bg" style={{ animationDelay: '0.2s' }}>
        <ZodiacAffirmations zodiacSign={zodiacSign} />
      </div>

      {/* Compatibility Snapshot */}
      <div className="mb-5 animate-fade-in section-fade-bg" style={{ animationDelay: '0.25s' }}>
        <CompatibilitySnapshot zodiacSign={zodiacSign} />
      </div>

      {/* Cosmic Soundscapes */}
      <div className="mb-5 animate-fade-in section-fade-bg" style={{ animationDelay: '0.3s' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Cosmic Soundscapes</h2>
        <div className="flex justify-evenly">
          {COSMIC_SOUNDS.map((sound) => {
            const Icon = sound.icon
            return (
              <button
                key={sound.id}
                aria-label={`Play ${sound.word} soundscape`}
                onClick={() => setPlayingSound(sound)}
                className="flex flex-col items-center gap-2 press-scale"
              >
                <div className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 card-cosmic-round">
                  <Icon className="w-5 h-5 text-indigo-300" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] text-white/95">{sound.word}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom spacing for nav */}
      <div className="h-24" />
    </div>
  )
}
