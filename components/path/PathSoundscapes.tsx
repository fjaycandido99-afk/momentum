'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Headphones, Flame, Waves, Moon, Wind, CloudLightning, TreePine, CloudRain, Music, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'
import { PATH_SOUNDSCAPES, type PathSoundscape } from '@/lib/mindset/path-soundscapes'

const WordAnimationPlayer = dynamic(
  () => import('@/components/player/WordAnimationPlayer').then(mod => mod.WordAnimationPlayer),
  { ssr: false }
)

const SOUND_ICONS: Record<string, LucideIcon> = {
  focus: Target,
  fire: Flame,
  stream: Waves,
  night: Moon,
  wind: Wind,
  ocean: Waves,
  thunder: CloudLightning,
  forest: TreePine,
  rain: CloudRain,
  piano: Music,
  cosmos: Target,
}

interface PathSoundscapesProps {
  mindsetId: MindsetId
  onPathActivity?: () => void
}

export function PathSoundscapes({ mindsetId, onPathActivity }: PathSoundscapesProps) {
  const [playingSound, setPlayingSound] = useState<PathSoundscape | null>(null)
  const soundscapes = PATH_SOUNDSCAPES[mindsetId]

  return (
    <>
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

      <div className="card-path p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <Headphones className="w-4 h-4 text-white/85" />
          <h3 className="text-sm font-medium text-white">Path Soundscapes</h3>
        </div>

        <div className="flex justify-evenly">
          {soundscapes.map((sound) => {
            const Icon = SOUND_ICONS[sound.id] || Music
            return (
              <button
                key={sound.id}
                aria-label={`Play ${sound.word} soundscape`}
                onClick={() => {
                  setPlayingSound(sound)
                  fetch('/api/path/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activity: 'soundscape' }),
                  }).catch(() => {})
                  onPathActivity?.()
                }}
                className="flex flex-col items-center gap-2 press-scale"
              >
                <div className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 card-path-round">
                  <Icon className="w-5 h-5 text-white/80" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] text-white/95">{sound.word}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
