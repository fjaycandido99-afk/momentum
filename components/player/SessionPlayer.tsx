'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Pause, X, SkipForward, Volume2, Check, Music } from 'lucide-react'

type ActivityType = 'workout' | 'morning' | 'commute' | 'evening'

interface SessionPlayerProps {
  activityType: ActivityType
  duration: number // minutes
  onComplete: () => void
}

interface ContentSegment {
  type: 'activation' | 'breathing' | 'micro_lesson' | 'cooldown'
  text: string
  duration: number // seconds
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  workout: 'WORKOUT',
  morning: 'MORNING',
  commute: 'COMMUTE',
  evening: 'WIND DOWN',
}

// Background ambient tracks (royalty-free URLs)
const AMBIENT_TRACKS: Record<ActivityType, string> = {
  workout: 'https://cdn.pixabay.com/audio/2024/11/29/audio_4956b4caf1.mp3', // Energetic ambient
  morning: 'https://cdn.pixabay.com/audio/2024/02/14/audio_88e15d5d05.mp3', // Calm morning
  commute: 'https://cdn.pixabay.com/audio/2022/10/25/audio_544dd97b35.mp3', // Focus ambient
  evening: 'https://cdn.pixabay.com/audio/2024/09/10/audio_6e5d7d1912.mp3', // Relaxing evening
}

export function SessionPlayer({ activityType, duration, onComplete }: SessionPlayerProps) {
  const [isPaused, setIsPaused] = useState(false)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [segments, setSegments] = useState<ContentSegment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const [displayText, setDisplayText] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [segmentProgress, setSegmentProgress] = useState(0)
  const [useElevenLabs, setUseElevenLabs] = useState(true)
  const [ambientEnabled, setAmbientEnabled] = useState(true)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const segmentTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ambientRef = useRef<HTMLAudioElement | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Initialize ambient audio
  useEffect(() => {
    if (typeof window === 'undefined') return

    const ambient = new Audio(AMBIENT_TRACKS[activityType])
    ambient.loop = true
    ambient.volume = 0.15 // Low background volume
    ambientRef.current = ambient

    return () => {
      ambient.pause()
      ambient.src = ''
    }
  }, [activityType])

  // Control ambient based on state
  useEffect(() => {
    const ambient = ambientRef.current
    if (!ambient) return

    if (ambientEnabled && !isPaused && !isLoading && !isComplete) {
      ambient.play().catch(() => {})
    } else {
      ambient.pause()
    }
  }, [ambientEnabled, isPaused, isLoading, isComplete])

  // ElevenLabs TTS function
  const speakWithElevenLabs = useCallback(async (text: string) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error('TTS failed')
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        // Fallback response - use browser TTS
        speakWithBrowser(text)
        return
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      if (audioRef.current) {
        audioRef.current.pause()
      }

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch {
      // Fallback to browser TTS
      speakWithBrowser(text)
    }
  }, [])

  // Browser TTS fallback
  const speakWithBrowser = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))
    ) || voices.find((v) => v.lang.startsWith('en'))

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  // Main speak function
  const speak = useCallback((text: string) => {
    if (useElevenLabs) {
      speakWithElevenLabs(text)
    } else {
      speakWithBrowser(text)
    }
  }, [useElevenLabs, speakWithElevenLabs, speakWithBrowser])

  // Stop all audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  // Toggle pause for audio
  const toggleAudioPause = useCallback((pause: boolean) => {
    if (audioRef.current) {
      if (pause) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(() => {})
      }
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (pause) {
        window.speechSynthesis.pause()
      } else {
        window.speechSynthesis.resume()
      }
    }
  }, [])

  // Generate session content on mount
  useEffect(() => {
    generateSessionContent()
  }, [activityType, duration])

  // Main timer
  useEffect(() => {
    if (!isPaused && segments.length > 0 && !isComplete) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, segments, isComplete])

  // Segment progression
  useEffect(() => {
    if (isPaused || segments.length === 0 || isComplete) return

    const currentSegment = segments[currentSegmentIndex]
    if (!currentSegment) {
      setIsComplete(true)
      stopAudio()
      return
    }

    setDisplayText(currentSegment.text)
    setSegmentProgress(0)

    // Speak the segment text
    speak(currentSegment.text)

    segmentTimerRef.current = setInterval(() => {
      setSegmentProgress(prev => {
        const newProgress = prev + (100 / currentSegment.duration)
        if (newProgress >= 100) {
          if (currentSegmentIndex < segments.length - 1) {
            setCurrentSegmentIndex(prev => prev + 1)
          } else {
            setIsComplete(true)
            stopAudio()
          }
          return 0
        }
        return newProgress
      })
    }, 1000)

    return () => {
      if (segmentTimerRef.current) clearInterval(segmentTimerRef.current)
    }
  }, [currentSegmentIndex, isPaused, segments, isComplete, speak, stopAudio])

  // Handle pause/resume
  useEffect(() => {
    toggleAudioPause(isPaused)
  }, [isPaused, toggleAudioPause])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio()
      if (ambientRef.current) {
        ambientRef.current.pause()
      }
    }
  }, [stopAudio])

  const generateSessionContent = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityType, duration }),
      })

      if (response.ok) {
        const data = await response.json()
        setSegments(data.segments)
      } else {
        setSegments(getFallbackContent(activityType, duration))
      }
    } catch {
      setSegments(getFallbackContent(activityType, duration))
    }

    setIsLoading(false)
  }

  const skipSegment = () => {
    stopAudio()
    if (currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1)
    } else {
      setIsComplete(true)
    }
  }

  const handleClose = () => {
    stopAudio()
    if (ambientRef.current) {
      ambientRef.current.pause()
    }
    onComplete()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentSegment = segments[currentSegmentIndex]
  const segmentTypeLabel = currentSegment?.type === 'activation' ? 'MOTIVATION'
    : currentSegment?.type === 'breathing' ? 'BREATHE'
    : currentSegment?.type === 'micro_lesson' ? 'INSIGHT'
    : 'COOL DOWN'

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Volume2 className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <p className="text-white/60">Preparing your session...</p>
        </div>
      </div>
    )
  }

  // Completion state
  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-400" />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-light text-white mb-2">Session complete.</h2>
            <p className="text-white/50">Nice work.</p>
          </div>

          <div className="flex items-center gap-6 text-white/40 text-sm mt-4">
            <span>{formatTime(elapsedSeconds)}</span>
            <span>•</span>
            <span>{segments.length} segments</span>
          </div>

          <button
            onClick={onComplete}
            className="mt-8 px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            Done
          </button>

          <p className="text-white/30 text-xs mt-4">
            Same time tomorrow?
          </p>
        </div>
      </div>
    )
  }

  // Playing state
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <span className="text-sm text-white/60">{formatTime(elapsedSeconds)}</span>
        <button
          onClick={skipSegment}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <SkipForward className="w-6 h-6" />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Segment type indicator */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs uppercase tracking-wider text-white/40">
            {ACTIVITY_LABELS[activityType]}
          </span>
          <span className="text-white/20">·</span>
          <span className="text-sm uppercase tracking-wider text-blue-400 font-medium">
            {segmentTypeLabel}
          </span>
        </div>

        {/* Audio visualization */}
        <div className="w-full max-w-xs h-24 flex items-center justify-center gap-1 mb-8">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-blue-500 rounded-full transition-all duration-150"
              style={{
                height: isPaused ? '8px' : `${Math.random() * 60 + 20}px`,
                opacity: isPaused ? 0.3 : 0.8,
              }}
            />
          ))}
        </div>

        {/* Text display */}
        <p className="text-2xl font-light text-center leading-relaxed max-w-md">
          {displayText}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-white/10">
        <div
          className="h-full bg-blue-500 transition-all duration-1000"
          style={{ width: `${segmentProgress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 p-8">
        {/* Ambient toggle */}
        <button
          onClick={() => setAmbientEnabled(!ambientEnabled)}
          className={`p-3 rounded-full transition-colors ${
            ambientEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40'
          }`}
        >
          <Music className="w-5 h-5" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          {isPaused ? (
            <svg className="w-10 h-10 ml-1" fill="white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <Pause className="w-10 h-10" />
          )}
        </button>

        {/* Voice toggle */}
        <button
          onClick={() => setUseElevenLabs(!useElevenLabs)}
          className={`p-3 rounded-full transition-colors ${
            useElevenLabs ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40'
          }`}
          title={useElevenLabs ? 'AI Voice (ElevenLabs)' : 'Browser Voice'}
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {/* Segment indicators */}
      <div className="flex items-center justify-center gap-2 pb-8">
        {segments.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentSegmentIndex
                ? 'w-4 bg-blue-500'
                : i < currentSegmentIndex
                ? 'w-2 bg-white/40'
                : 'w-2 bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// Fallback content when API is unavailable
function getFallbackContent(activityType: ActivityType, duration: number): ContentSegment[] {
  const segments: ContentSegment[] = []

  const activationTexts: Record<ActivityType, string[]> = {
    workout: [
      "You don't need motivation. You just need momentum. Start slow. Start now.",
      "Your body is ready. Your mind will follow.",
    ],
    morning: [
      "A new day. A fresh start. What you do now sets the tone.",
      "Before the world asks anything of you, choose who you want to be today.",
    ],
    commute: [
      "This time is yours. Use it to prepare, not just to pass.",
      "The mind needs direction. Give it something worthy to focus on.",
    ],
    evening: [
      "The day is done. Let the tension go.",
      "You showed up today. That matters more than you know.",
    ],
  }

  activationTexts[activityType].forEach((text) => {
    segments.push({ type: 'activation', text, duration: 30 })
  })

  segments.push({
    type: 'breathing',
    text: "In through the nose. Out through the mouth. Strong body. Calm mind.",
    duration: 30,
  })

  const lessons = [
    "Consistency beats intensity every time. Small actions, repeated daily, create massive results.",
    "The person who moves forward slowly still beats the person who doesn't move at all.",
    "Discipline is choosing between what you want now and what you want most.",
  ]

  const lessonCount = Math.max(2, Math.floor(duration / 7))
  lessons.slice(0, lessonCount).forEach((text) => {
    segments.push({ type: 'micro_lesson', text, duration: 45 })
  })

  segments.push({
    type: 'breathing',
    text: "Deep breath in. Hold. And release. You're doing well.",
    duration: 30,
  })

  if (duration >= 15) {
    segments.push({
      type: 'micro_lesson',
      text: "Success is not about perfection. It's about showing up, even when it's hard.",
      duration: 45,
    })
  }

  if (duration >= 20) {
    segments.push({
      type: 'breathing',
      text: "Breathe. Reset. Continue. You're doing better than you think.",
      duration: 30,
    })
    segments.push({
      type: 'micro_lesson',
      text: "Energy flows where attention goes. Focus on what you can control.",
      duration: 45,
    })
  }

  const cooldownTexts: Record<ActivityType, string[]> = {
    workout: [
      "Well done. You showed up. That's what matters most.",
      "Carry this energy with you. You're stronger than you were before.",
    ],
    morning: [
      "You're ready. Go make it count.",
      "The day is yours. Own it.",
    ],
    commute: [
      "You're prepared. Whatever comes, you can handle it.",
      "Stay focused. Stay grounded. You've got this.",
    ],
    evening: [
      "Rest well tonight. Tomorrow is another opportunity.",
      "Be proud of today. Let go of what you can't control.",
    ],
  }

  cooldownTexts[activityType].forEach((text) => {
    segments.push({ type: 'cooldown', text, duration: 30 })
  })

  return segments
}
