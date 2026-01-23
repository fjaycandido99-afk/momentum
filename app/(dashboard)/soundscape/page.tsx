'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Focus, Moon, Sparkles, Zap, Play } from 'lucide-react'

// Dynamic imports to avoid hydration issues
const EndelPlayer = dynamic(
  () => import('@/components/player/EndelPlayer').then(mod => mod.EndelPlayer),
  { ssr: false }
)

const WordAnimationPlayer = dynamic(
  () => import('@/components/player/WordAnimationPlayer').then(mod => mod.WordAnimationPlayer),
  { ssr: false }
)

type Mode = 'focus' | 'relax' | 'sleep' | 'energy' | null

// Get time-based greeting and suggestion
function getTimeContext() {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 9) {
    return { greeting: 'Good morning', suggested: 'energy' as const, period: 'morning' }
  } else if (hour >= 9 && hour < 17) {
    return { greeting: 'Good afternoon', suggested: 'focus' as const, period: 'afternoon' }
  } else if (hour >= 17 && hour < 21) {
    return { greeting: 'Good evening', suggested: 'relax' as const, period: 'evening' }
  } else {
    return { greeting: 'Good night', suggested: 'sleep' as const, period: 'night' }
  }
}

const MODES = [
  {
    id: 'focus' as const,
    label: 'Focus',
    description: 'Deep work & concentration',
    icon: Focus,
    gradient: 'from-white/[0.04] to-white/[0.02]',
    iconColor: 'text-white/80',
    borderColor: 'border-white/10',
  },
  {
    id: 'relax' as const,
    label: 'Relax',
    description: 'Calm your mind',
    icon: Sparkles,
    gradient: 'from-white/[0.04] to-white/[0.02]',
    iconColor: 'text-white/80',
    borderColor: 'border-white/10',
  },
  {
    id: 'sleep' as const,
    label: 'Sleep',
    description: 'Drift into rest',
    icon: Moon,
    gradient: 'from-white/[0.04] to-white/[0.02]',
    iconColor: 'text-white/80',
    borderColor: 'border-white/10',
  },
  {
    id: 'energy' as const,
    label: 'Energy',
    description: 'Power & motivation',
    icon: Zap,
    gradient: 'from-white/[0.04] to-white/[0.02]',
    iconColor: 'text-white/80',
    borderColor: 'border-white/10',
  },
]

// Ambient sounds
const AMBIENT_SOUNDS = [
  { id: 'rain', word: 'Rain', color: 'from-white/[0.06] to-white/[0.02]', youtubeId: 'mPZkdNFkNps', script: '' },
  { id: 'ocean', word: 'Ocean', color: 'from-white/[0.06] to-white/[0.02]', youtubeId: 'WHPEKLQID4U', script: '' },
  { id: 'forest', word: 'Forest', color: 'from-white/[0.06] to-white/[0.02]', youtubeId: 'xNN7iTA57jM', script: '' },
  { id: 'fire', word: 'Fire', color: 'from-white/[0.06] to-white/[0.02]', youtubeId: 'UgHKb_7884o', script: '' },
  { id: 'thunder', word: 'Thunder', color: 'from-white/[0.06] to-white/[0.02]', youtubeId: 'nDq6TstdEi8', script: '' },
  { id: 'night', word: 'Night', color: 'from-white/[0.06] to-white/[0.02]', youtubeId: 'asSd6BOCmEY', script: '' },
]

export default function SoundscapePage() {
  const [activeMode, setActiveMode] = useState<Mode>(null)
  const [playingSound, setPlayingSound] = useState<typeof AMBIENT_SOUNDS[0] | null>(null)
  const [timeContext, setTimeContext] = useState(getTimeContext())

  // Update time context periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeContext(getTimeContext())
    }, 60000) // Every minute
    return () => clearInterval(interval)
  }, [])

  const startMode = (mode: Mode) => {
    setActiveMode(mode)
  }

  const closePlayer = () => {
    setActiveMode(null)
    setPlayingSound(null)
  }

  return (
    <div className="min-h-screen bg-[#08080c] text-white">
      {/* Endel Player overlay */}
      {activeMode && (
        <EndelPlayer mode={activeMode} onClose={closePlayer} />
      )}

      {/* Ambient Sound Player overlay */}
      {playingSound && (
        <WordAnimationPlayer
          word={playingSound.word}
          script={playingSound.script}
          color={playingSound.color}
          youtubeId={playingSound.youtubeId}
          onClose={closePlayer}
        />
      )}

      {/* Main content */}
      <div className="px-6 py-12">
        {/* Header */}
        <div className="mb-8 animate-fade-in-down">
          <p className="text-white/60 text-sm mb-1">{timeContext.greeting}</p>
          <h1 className="text-3xl font-light text-white">How do you want to feel?</h1>
        </div>

        {/* Suggested mode */}
        <div className="mb-8">
          <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Suggested for {timeContext.period}</p>
          {MODES.filter(m => m.id === timeContext.suggested).map(mode => (
            <button
              key={mode.id}
              onClick={() => startMode(mode.id)}
              className={`w-full p-6 rounded-3xl bg-gradient-to-br ${mode.gradient} border ${mode.borderColor} backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-[0.98] animate-scale-in animate-glow-pulse`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl bg-white/5 ${mode.iconColor}`}>
                  <mode.icon className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-medium text-white">{mode.label}</h2>
                  <p className="text-white/60 text-sm">{mode.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* All modes */}
        <div className="mb-10">
          <p className="text-white/60 text-xs uppercase tracking-wider mb-3">All modes</p>
          <div className="grid grid-cols-2 gap-4">
            {MODES.map((mode, index) => (
              <button
                key={mode.id}
                onClick={() => startMode(mode.id)}
                className={`p-5 rounded-2xl bg-gradient-to-br ${mode.gradient} border ${mode.borderColor} backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(255,255,255,0.12)] active:scale-[0.98] animate-fade-in opacity-0 stagger-${index + 1} hover-lift`}
              >
                <div className={`p-2 rounded-xl bg-white/5 ${mode.iconColor} w-fit mb-3`}>
                  <mode.icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-medium text-white text-left">{mode.label}</h3>
                <p className="text-white/60 text-xs text-left mt-1">{mode.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Ambient Sounds */}
        <div>
          <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Ambient Sounds</p>
          <div className="grid grid-cols-2 gap-3">
            {AMBIENT_SOUNDS.map((sound, index) => (
              <button
                key={sound.id}
                onClick={() => setPlayingSound(sound)}
                className={`relative p-5 rounded-2xl bg-gradient-to-br ${sound.color} overflow-hidden group transition-all hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(255,255,255,0.15)] active:scale-[0.98] animate-fade-in opacity-0 stagger-${index + 1} hover-lift`}
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-5 h-5 text-white/80" fill="white" />
                </div>
                <h3 className="text-lg font-medium text-white">{sound.word}</h3>
                <p className="text-white/60 text-xs mt-1">Tap to play</p>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom spacing for nav */}
        <div className="h-24" />
      </div>
    </div>
  )
}
