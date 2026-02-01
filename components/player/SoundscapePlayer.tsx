'use client'

import { useEffect, useRef } from 'react'
import { Play, Pause, ChevronDown, Focus, Sparkles, Moon, Zap, CloudRain, Waves, Trees, Flame, CloudLightning, Star, Wind, Droplets, Coffee, Music } from 'lucide-react'
import { DailyBackground } from './DailyBackground'

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
  { id: 'sleep', label: 'Sleep', subtitle: 'Drift away', icon: Moon, youtubeId: 'asSd6BOCmEY' },
  { id: 'energy', label: 'Energy', subtitle: 'Power up', icon: Zap, youtubeId: 'jfKfPfyJRdk' },
  { id: 'rain', label: 'Rain', subtitle: 'Gentle rainfall', icon: CloudRain, youtubeId: 'mPZkdNFkNps' },
  { id: 'ocean', label: 'Ocean', subtitle: 'Crashing waves', icon: Waves, youtubeId: 'WHPEKLQID4U' },
  { id: 'forest', label: 'Forest', subtitle: 'Nature sounds', icon: Trees, youtubeId: 'xNN7iTA57jM' },
  { id: 'fire', label: 'Fire', subtitle: 'Crackling fireplace', icon: Flame, youtubeId: 'UgHKb_7884o' },
  { id: 'thunder', label: 'Thunder', subtitle: 'Thunderstorm', icon: CloudLightning, youtubeId: 'nDq6TstdEi8' },
  { id: 'night', label: 'Night', subtitle: 'Nighttime ambience', icon: Star, youtubeId: 'asSd6BOCmEY' },
  { id: 'wind', label: 'Wind', subtitle: 'Gentle breeze', icon: Wind, youtubeId: '2dDuMb8XWTA' },
  { id: 'stream', label: 'Stream', subtitle: 'Flowing water', icon: Droplets, youtubeId: 'IvjMgVS6kng' },
  { id: 'cafe', label: 'Cafe', subtitle: 'Coffee shop ambience', icon: Coffee, youtubeId: 'gaGrHUekGrc' },
  { id: 'piano', label: 'Piano', subtitle: 'Soft melodies', icon: Music, youtubeId: '77ZozI0rw7w' },
]

export function SoundscapePlayer({ soundId, label, subtitle, youtubeId, isPlaying, onTogglePlay, onClose, onSwitchSound }: SoundscapePlayerProps) {
  const selectorRef = useRef<HTMLDivElement>(null)

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
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center px-6 pt-12 pb-4 animate-fade-in-down">
        <button
          aria-label="Close player"
          onClick={onClose}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <ChevronDown className="w-6 h-6 text-white/95" />
        </button>
        <div className="flex-1 text-center pr-10">
          <h1 className="text-xl font-semibold text-white">{label}</h1>
          <p className="text-sm text-white/95 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Animated center — constellation */}
      <div className="flex-1 relative overflow-hidden">
        <DailyBackground animate={isPlaying} className="absolute inset-0" />
      </div>

      {/* Sound selector row */}
      <div ref={selectorRef} className="flex gap-5 overflow-x-auto px-6 pb-4 scrollbar-hide animate-fade-in" style={{ animationDelay: '0.15s' }}>
        {SOUNDSCAPE_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.id === soundId
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
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'bg-white/15 border-2 border-white/40'
                  : 'bg-white/5 border border-white/10'
              }`}>
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-white/95'}`} strokeWidth={1.5} />
              </div>
              <span className={`text-[10px] transition-colors ${isActive ? 'text-white' : 'text-white/95'}`}>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Play controls */}
      <div className="flex justify-center pb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <button
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={onTogglePlay}
          className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/15 transition-colors press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 text-white" fill="white" />
          ) : (
            <Play className="w-7 h-7 text-white ml-0.5" fill="white" />
          )}
        </button>
      </div>
    </div>
  )
}
