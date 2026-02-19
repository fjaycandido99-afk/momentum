'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, ChevronDown, Focus, Sparkles, Moon, Zap, CloudRain, Waves, Trees, Flame, CloudLightning, Star, Wind, Droplets, Coffee, Music, Lock } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface SoundscapePlayerProps {
  soundId: string
  label: string
  subtitle: string
  youtubeId: string
  isPlaying: boolean
  onTogglePlay: () => void
  onClose: () => void
  onSwitchSound: (id: string, label: string, subtitle: string, youtubeId: string) => void
}

export type SoundscapeItem = {
  id: string
  label: string
  subtitle: string
  icon: typeof Focus
  youtubeId: string
}

export const SOUNDSCAPE_ITEMS: SoundscapeItem[] = [
  { id: 'focus', label: 'Focus', subtitle: 'Deep concentration', icon: Focus, youtubeId: 'mPZkdNFkNps' },
  { id: 'relax', label: 'Relax', subtitle: 'Calm your mind', icon: Sparkles, youtubeId: 'WHPEKLQID4U' },
  { id: 'sleep', label: 'Sleep', subtitle: 'Drift away', icon: Moon, youtubeId: 'T8yEdNx4dB0' },
  { id: 'energy', label: 'Energy', subtitle: 'Power up', icon: Zap, youtubeId: 'jfKfPfyJRdk' },
  { id: 'rain', label: 'Rain', subtitle: 'Gentle rainfall', icon: CloudRain, youtubeId: 'mPZkdNFkNps' },
  { id: 'ocean', label: 'Ocean', subtitle: 'Crashing waves', icon: Waves, youtubeId: 'WHPEKLQID4U' },
  { id: 'forest', label: 'Forest', subtitle: 'Nature sounds', icon: Trees, youtubeId: 'xNN7iTA57jM' },
  { id: 'fire', label: 'Fire', subtitle: 'Crackling fireplace', icon: Flame, youtubeId: 'UgHKb_7884o' },
  { id: 'thunder', label: 'Thunder', subtitle: 'Thunderstorm', icon: CloudLightning, youtubeId: 'nDq6TstdEi8' },
  { id: 'night', label: 'Night', subtitle: 'Nighttime ambience', icon: Star, youtubeId: 'NgHhs3B1xnc' },
  { id: 'wind', label: 'Wind', subtitle: 'Gentle breeze', icon: Wind, youtubeId: '2dDuMb8XWTA' },
  { id: 'stream', label: 'Stream', subtitle: 'Flowing water', icon: Droplets, youtubeId: 'IvjMgVS6kng' },
  { id: 'cafe', label: 'Cafe', subtitle: 'Coffee shop ambience', icon: Coffee, youtubeId: 'gaGrHUekGrc' },
  { id: 'piano', label: 'Piano', subtitle: 'Soft melodies', icon: Music, youtubeId: '77ZozI0rw7w' },
  // Cosmic soundscapes
  { id: 'cosmic', label: 'Cosmic', subtitle: 'Space ambient', icon: Sparkles, youtubeId: 'GPvQ5ZWWF1w' },
  { id: 'astral', label: 'Astral', subtitle: 'Celestial drift', icon: Star, youtubeId: 'e3fqE01YYWs' },
  { id: 'starlight', label: 'Starlight', subtitle: 'Night sky', icon: Moon, youtubeId: 'zcm6nV7Bod8' },
]

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const SOUNDSCAPE_BACKGROUNDS: Record<string, string[]> = {
  rain: [
    `${SB}/storage/v1/object/public/backgrounds/rain/rain-01.jpg?v=4`,
    `${SB}/storage/v1/object/public/backgrounds/rain/rain-02.jpg?v=4`,
    `${SB}/storage/v1/object/public/backgrounds/rain/rain-03.jpg?v=4`,
  ],
  sleep: [
    `${SB}/storage/v1/object/public/backgrounds/sleep/sleep-bg-01.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/sleep/sleep-bg-02.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/sleep/sleep-bg-03.jpg?v=1`,
  ],
  relax: [
    `${SB}/storage/v1/object/public/backgrounds/relax/relax-01.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/relax/relax-02.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/relax/relax-03.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/relax/relax-04.jpg?v=1`,
  ],
  ocean: [
    `${SB}/storage/v1/object/public/backgrounds/ocean/ocean-01.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/ocean/ocean-02.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/ocean/ocean-03.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/ocean/ocean-04.jpg?v=1`,
  ],
  forest: [
    `${SB}/storage/v1/object/public/backgrounds/forest/forest-01.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/forest/forest-02.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/forest/forest-03.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/forest/forest-04.jpg?v=1`,
  ],
  thunder: [
    `${SB}/storage/v1/object/public/backgrounds/thunder/thunder-01.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/thunder/thunder-02.jpg?v=1`,
  ],
  fire: [
    `${SB}/storage/v1/object/public/backgrounds/fire/fire-01.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/fire/fire-02.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/fire/fire-03.jpg?v=1`,
  ],
  night: [
    `${SB}/storage/v1/object/public/backgrounds/night/night-01.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/night/night-02.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/night/night-03.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/night/night-04.jpg?v=1`,
  ],
  wind: [
    `${SB}/storage/v1/object/public/backgrounds/wind/wind-01.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/wind/wind-02.jpg?v=1`,
  ],
  stream: [
    `${SB}/storage/v1/object/public/backgrounds/stream/stream-01.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/stream/stream-02.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/stream/stream-03.jpg?v=1`,
  ],
  cafe: [
    `${SB}/storage/v1/object/public/backgrounds/cafe/cafe-01.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/cafe/cafe-02.jpg?v=1`,
    `${SB}/storage/v1/object/public/backgrounds/cafe/cafe-03.jpg?v=1`,
  ],
}

export function SoundscapePlayer({ soundId, label, subtitle, youtubeId, isPlaying, onTogglePlay, onClose, onSwitchSound }: SoundscapePlayerProps) {
  const selectorRef = useRef<HTMLDivElement>(null)
  const { isContentFree } = useSubscription()
  const [bgIndex, setBgIndex] = useState(0)

  // Pick a random background image when switching to a soundscape that has images
  useEffect(() => {
    const images = SOUNDSCAPE_BACKGROUNDS[soundId]
    if (images) setBgIndex(Math.floor(Math.random() * images.length))
  }, [soundId])

  const bgImages = SOUNDSCAPE_BACKGROUNDS[soundId]
  const hasBg = bgImages && bgImages.length > 0

  // Scroll active item into view when sound changes
  useEffect(() => {
    if (selectorRef.current) {
      const activeEl = selectorRef.current.querySelector(`[data-sound-id="${soundId}"]`)
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [soundId])

  return (
    <div className="fixed inset-0 z-[55] flex flex-col overflow-hidden overscroll-none" style={{ backgroundColor: '#000000' }}>
      {/* === Fullscreen background image (for soundscapes with artwork) === */}
      {hasBg && (
        <>
          <img
            src={bgImages[bgIndex]}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50 z-[2]" />
        </>
      )}

      {/* === Top bar (overlaid on artwork) === */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] h-14 z-20">
        <button
          aria-label="Close player"
          onClick={onClose}
          className="p-2 -ml-2 focus-visible:outline-none"
        >
          <ChevronDown className="w-7 h-7 text-white" />
        </button>

        <span className="absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
          Soundscape
        </span>

        <div className="w-7" />
      </div>

      {/* === Fullscreen artwork === */}
      {!hasBg ? (
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-3xl md:text-4xl font-bold text-white uppercase tracking-[0.15em]"
              style={{ textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}
            >
              {label}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0" />
      )}

      {/* === Bottom controls === */}
      <div className="relative flex-shrink-0 px-6 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4 z-10" style={{ backgroundColor: hasBg ? 'transparent' : '#000000' }}>
        {/* Title + subtitle */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white" style={{ letterSpacing: '-0.01em' }}>
            {label}
          </h1>
          <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>
        </div>

        {/* Sound selector row */}
        <div ref={selectorRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
          {SOUNDSCAPE_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.id === soundId
            const isLocked = !isContentFree('soundscape', item.id)
            return (
              <button
                key={item.id}
                data-sound-id={item.id}
                onClick={() => {
                  if (item.id !== soundId) {
                    onSwitchSound(item.id, item.label, item.subtitle, item.youtubeId)
                  }
                }}
                className="flex flex-col items-center gap-1.5 shrink-0"
              >
                <div className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-black'
                    : 'bg-white/[0.08] border border-white/15 text-white/70'
                }`}>
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                  {isLocked && !isActive && (
                    <Lock className="absolute -top-0.5 -right-0.5 w-3 h-3 text-white" />
                  )}
                </div>
                <span className={`text-[10px] transition-colors ${isActive ? 'text-white' : 'text-white/50'}`}>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Play/Pause — Spotify-style white circle */}
        <div className="flex justify-center py-2">
          <button
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 text-black" fill="black" />
            ) : (
              <Play className="w-7 h-7 text-black ml-0.5" fill="black" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
