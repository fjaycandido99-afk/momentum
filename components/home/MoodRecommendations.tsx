'use client'

import { useState, useEffect } from 'react'
import { CloudRain, Music, Wind, Mic } from 'lucide-react'
import {
  EXTENDED_MOODS, MOOD_ICONS, MOOD_MAP,
  type ExtendedMood, type MoodRecommendation,
} from '@/lib/mood-recommendations'

interface MoodRecommendationsProps {
  onPlaySoundscape: (soundscapeId: string) => void
  onPlayGenre: (genreId: string) => void
}

const STORAGE_KEY = 'voxu_mood_today'

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

const REC_ITEMS = [
  { key: 'soundscape', Icon: CloudRain, label: (r: MoodRecommendation) => r.soundscape, suffix: 'soundscape' },
  { key: 'music', Icon: Music, label: (r: MoodRecommendation) => r.musicGenre, suffix: 'music' },
  { key: 'breathing', Icon: Wind, label: (r: MoodRecommendation) => r.breathing, suffix: 'breathing' },
  { key: 'motivation', Icon: Mic, label: (r: MoodRecommendation) => r.motivationTopic, suffix: 'motivation' },
] as const

export function MoodRecommendations({ onPlaySoundscape, onPlayGenre }: MoodRecommendationsProps) {
  const [selectedMood, setSelectedMood] = useState<ExtendedMood | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        if (data.date === getTodayKey() && data.mood) {
          setSelectedMood(data.mood)
        }
      }
    } catch {}
  }, [])

  const handleSelect = (mood: ExtendedMood) => {
    setSelectedMood(mood)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: getTodayKey(), mood }))
    } catch {}
  }

  if (hidden) return null

  const rec = selectedMood ? MOOD_MAP[selectedMood] : null

  return (
    <div className="mb-8 liquid-reveal section-fade-bg">
      <h2 className="text-lg font-semibold text-white px-6 mb-4 parallax-header">
        {selectedMood ? `Feeling ${selectedMood}` : 'How are you feeling?'}
      </h2>

      {!selectedMood ? (
        <div className="flex gap-4 overflow-x-auto px-6 pt-2 pb-4 scrollbar-hide">
          {EXTENDED_MOODS.map((mood) => (
            <button
              key={mood}
              onClick={() => handleSelect(mood)}
              className="flex flex-col items-center gap-2 shrink-0 press-scale"
            >
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 card-gradient-border-round">
                <span className="text-xl">{MOOD_ICONS[mood]}</span>
              </div>
              <span className="text-[11px] text-white">{mood}</span>
            </button>
          ))}
        </div>
      ) : rec ? (
        <div className="flex gap-4 overflow-x-auto px-6 pt-2 pb-4 scrollbar-hide">
          {REC_ITEMS.map(({ key, Icon, label, suffix }) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'soundscape') onPlaySoundscape(rec.soundscape)
                else if (key === 'music') onPlayGenre(rec.musicGenre)
              }}
              className="flex flex-col items-center gap-2 shrink-0 press-scale"
            >
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 card-gradient-border-round">
                <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] text-white capitalize">{label(rec)}</span>
                <span className="text-[9px] text-white/60">{suffix}</span>
              </div>
            </button>
          ))}
          <button
            onClick={() => setHidden(true)}
            className="flex flex-col items-center gap-2 shrink-0 press-scale"
          >
            <div className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 card-gradient-border-round">
              <span className="text-lg text-white/50">&#x2715;</span>
            </div>
            <span className="text-[11px] text-white/50">Dismiss</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
