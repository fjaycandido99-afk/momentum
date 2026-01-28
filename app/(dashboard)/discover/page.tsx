'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Play, Pause, Wind, Sparkles, Heart, Anchor, Loader2, X, Moon, ChevronRight, Bookmark, Trash2 } from 'lucide-react'
import { useThemeOptional } from '@/contexts/ThemeContext'

// Dynamic import with no SSR to avoid hydration mismatch
const WordAnimationPlayer = dynamic(
  () => import('@/components/player/WordAnimationPlayer').then(mod => mod.WordAnimationPlayer),
  { ssr: false }
)

type TabType = 'motivation' | 'guided' | 'music' | 'saved'

// Pool of background images for MOTIVATION - each video gets a different one (randomized daily)
const BACKGROUND_IMAGES = [
  '/backgrounds/bg1.jpg',
  '/backgrounds/bg2.jpg',
  '/backgrounds/bg3.jpg',
  '/backgrounds/bg4.jpg',
  '/backgrounds/bg5.jpg',
  '/backgrounds/bg6.jpg',
  '/backgrounds/bg7.jpg',
  '/backgrounds/bg8.jpg',
  '/backgrounds/bg9.jpg',
  '/backgrounds/bg10.jpg',
  '/backgrounds/bg11.jpg',
  '/backgrounds/bg12.jpg',
  '/backgrounds/bg13.jpg',
  '/backgrounds/bg14.jpg',
  '/backgrounds/bg15.jpg',
  '/backgrounds/bg16.jpg',
  '/backgrounds/bg17.jpg',
  '/backgrounds/bg18.jpg',
  '/backgrounds/bg19.jpg',
  '/backgrounds/bg20.jpg',
  '/backgrounds/bg21.jpg',
  '/backgrounds/bg22.jpg',
  '/backgrounds/bg23.jpg',
  '/backgrounds/bg24.jpg',
  '/backgrounds/bg25.jpg',
  '/backgrounds/bg26.jpg',
  '/backgrounds/bg27.jpg',
  '/backgrounds/bg28.jpg',
  '/backgrounds/bg29.jpg',
  '/backgrounds/bg30.jpg',
  '/backgrounds/bg31.jpg',
]

// Backgrounds are now fetched from Supabase Storage via fetchVoicePlayerBackgrounds()

// Daily motivational topics - rotates daily, same for all users
// Channels that allow embedding: Motiversity, MotivationHub, Absolute Motivation, After Skool, T&H Inspiration
const DAILY_TOPICS = [
  {
    word: 'Discipline',
    tagline: 'Master yourself first',
    color: 'from-white/[0.06] to-white/[0.02]',
    videos: [
      { id: 'd1', title: 'SELF DISCIPLINE - Best Motivational Speech', youtubeId: 'W_VkLpnVFFo', channel: 'Motiversity' },
      { id: 'd2', title: 'THE POWER OF DISCIPLINE - Motivational Video', youtubeId: 'nm1TxQj9IsQ', channel: 'Motiversity' },
      { id: 'd3', title: 'DISCIPLINE YOUR MIND - Motivational Speech', youtubeId: 'v_1iqtOnUMg', channel: 'MotivationHub' },
      { id: 'd4', title: 'NO EXCUSES - Best Motivational Video', youtubeId: 'wnHW6o8WMas', channel: 'Motiversity' },
      { id: 'd5', title: 'OUTWORK EVERYONE - David Goggins Motivation', youtubeId: '2bm47ypLvTA', channel: 'MotivationHub' },
      { id: 'd6', title: 'THIS IS WHY DISCIPLINE MATTERS', youtubeId: 'dFfXEsnRHxE', channel: 'Absolute Motivation' },
      { id: 'd7', title: 'DISCIPLINE IS FREEDOM - Jocko Willink', youtubeId: 'IdTMDpizis8', channel: 'T&H Inspiration' },
      { id: 'd8', title: 'BUILD UNBREAKABLE DISCIPLINE', youtubeId: '8PGG2YPczU4', channel: 'MotivationHub' },
    ],
  },
  {
    word: 'Focus',
    tagline: 'Eliminate distractions',
    color: 'from-white/[0.06] to-white/[0.02]',
    videos: [
      { id: 'f1', title: 'FOCUS ON YOURSELF - Best Motivational Speech', youtubeId: 'J1R0hiaHdpM', channel: 'Motiversity' },
      { id: 'f2', title: 'STOP WASTING TIME - Motivational Video', youtubeId: 'cDDWvj_q-o8', channel: 'Motiversity' },
      { id: 'f3', title: 'LASER FOCUS - Powerful Motivational Speech', youtubeId: 'k9zTr2MAFRg', channel: 'MotivationHub' },
      { id: 'f4', title: 'THIS IS HOW WINNERS THINK', youtubeId: 'nU3IbigrFFs', channel: 'Motiversity' },
      { id: 'f5', title: 'CONTROL YOUR ATTENTION - Motivational Speech', youtubeId: 'fOGPpDzMWyE', channel: 'Absolute Motivation' },
      { id: 'f6', title: 'BECOME OBSESSED - Motivational Video', youtubeId: 'hZZ5dZzvsEM', channel: 'MotivationHub' },
      { id: 'f7', title: 'THE POWER OF FOCUS - Jim Rohn', youtubeId: 'vj-91dMvQQo', channel: 'T&H Inspiration' },
      { id: 'f8', title: 'ELIMINATE DISTRACTIONS - Motivational Speech', youtubeId: '7z0fDsET3bM', channel: 'Motiversity' },
    ],
  },
  {
    word: 'Mindset',
    tagline: 'Your thoughts shape reality',
    color: 'from-white/[0.06] to-white/[0.02]',
    videos: [
      { id: 'm1', title: 'CHANGE YOUR MINDSET - Motivational Speech', youtubeId: 'GXoErccq0vw', channel: 'Motiversity' },
      { id: 'm2', title: 'MINDSET IS EVERYTHING - Powerful Speech', youtubeId: '_UJfwCuLYbI', channel: 'Motiversity' },
      { id: 'm3', title: 'THINK DIFFERENT - Steve Jobs', youtubeId: 'keCwRdbwNQY', channel: 'Motivation2Study' },
      { id: 'm4', title: 'THE MINDSET OF A CHAMPION', youtubeId: 'yM8jrvF5zYs', channel: 'MotivationHub' },
      { id: 'm5', title: 'TRAIN YOUR MIND TO WIN', youtubeId: 'R8V71MbHP7k', channel: 'Absolute Motivation' },
      { id: 'm6', title: 'YOUR MIND IS POWERFUL - Les Brown', youtubeId: 'ULT_3CboVlE', channel: 'T&H Inspiration' },
      { id: 'm7', title: 'DEVELOP A WINNING MINDSET', youtubeId: 'k0oZ38JnPvM', channel: 'MotivationHub' },
      { id: 'm8', title: 'REPROGRAM YOUR MIND - Motivation', youtubeId: 'F1gIhn5lRl0', channel: 'Motiversity' },
    ],
  },
  {
    word: 'Courage',
    tagline: 'Fear is the enemy of progress',
    color: 'from-white/[0.06] to-white/[0.02]',
    videos: [
      { id: 'c1', title: 'FACE YOUR FEARS - Motivational Speech', youtubeId: 'II4xp4vzRT8', channel: 'Motiversity' },
      { id: 'c2', title: 'BE FEARLESS - Powerful Motivation', youtubeId: '2MvAtEr0W3g', channel: 'MotivationHub' },
      { id: 'c3', title: 'COURAGE - Best Motivational Video', youtubeId: 'mgmVOuLgFB0', channel: 'Motiversity' },
      { id: 'c4', title: 'TAKE THE RISK - Motivational Speech', youtubeId: 'pO_Z0H3gDPg', channel: 'Motiversity' },
      { id: 'c5', title: 'DO IT AFRAID - Powerful Speech', youtubeId: 'u7L89w3xmgY', channel: 'Absolute Motivation' },
      { id: 'c6', title: 'STEP OUT OF YOUR COMFORT ZONE', youtubeId: 'qCEQbTf7SBc', channel: 'T&H Inspiration' },
      { id: 'c7', title: 'CONQUER YOUR FEARS - Motivation', youtubeId: '1_9V5t6Wpfk', channel: 'MotivationHub' },
      { id: 'c8', title: 'BE BRAVE - Motivational Video', youtubeId: 'vNrLPniDMvk', channel: 'Motiversity' },
    ],
  },
  {
    word: 'Resilience',
    tagline: 'Get back up every time',
    color: 'from-white/[0.06] to-white/[0.02]',
    videos: [
      { id: 'r1', title: 'NEVER GIVE UP - Motivational Speech', youtubeId: 'kZlXWp6vFdE', channel: 'Motiversity' },
      { id: 'r2', title: 'KEEP GOING - Best Motivation', youtubeId: '8ZhoeSaPF-k', channel: 'Motiversity' },
      { id: 'r3', title: 'RISE UP - Powerful Motivational Speech', youtubeId: 'TqXLvwM8Ltk', channel: 'MotivationHub' },
      { id: 'r4', title: 'UNBREAKABLE - Motivational Video', youtubeId: 'p6HPRqCIZOQ', channel: 'Motiversity' },
      { id: 'r5', title: 'BOUNCE BACK STRONGER', youtubeId: '3eVIOiF9vF0', channel: 'Absolute Motivation' },
      { id: 'r6', title: 'WHEN LIFE KNOCKS YOU DOWN', youtubeId: 'FFgwBHpbsgM', channel: 'MotivationHub' },
      { id: 'r7', title: 'THE COMEBACK - Les Brown', youtubeId: 'rRNzpFbcNqI', channel: 'T&H Inspiration' },
      { id: 'r8', title: 'I WILL NOT QUIT - Motivation', youtubeId: 'F7bE1LMN1QU', channel: 'Motiversity' },
    ],
  },
  {
    word: 'Hustle',
    tagline: 'Outwork everyone',
    color: 'from-white/[0.06] to-white/[0.02]',
    videos: [
      { id: 'h1', title: 'WORK HARDER THAN EVERYONE - Motivation', youtubeId: 'g9_6RPn5VBs', channel: 'Motiversity' },
      { id: 'h2', title: 'GRIND NOW SHINE LATER - Motivation', youtubeId: 'P8P6RgUIhFg', channel: 'Motiversity' },
      { id: 'h3', title: 'NO DAYS OFF - Motivational Speech', youtubeId: '2X-8L5GBD-A', channel: 'Motiversity' },
      { id: 'h4', title: 'RISE AND GRIND - Motivational Video', youtubeId: 'G-J0lkyhz7o', channel: 'MotivationHub' },
      { id: 'h5', title: 'HUSTLE IN SILENCE - Powerful Speech', youtubeId: 'PyHXN_eYkpc', channel: 'Absolute Motivation' },
      { id: 'h6', title: 'THE GRIND - Best Motivation', youtubeId: 'qZSb5gVW9lM', channel: 'MotivationHub' },
      { id: 'h7', title: 'WORK WHILE THEY SLEEP', youtubeId: 'Rj_n7R0gptU', channel: 'T&H Inspiration' },
      { id: 'h8', title: 'OUTWORK EVERYONE AROUND YOU', youtubeId: 'HQtZ4kud2qA', channel: 'Motiversity' },
    ],
  },
  {
    word: 'Confidence',
    tagline: 'Believe in yourself',
    color: 'from-white/[0.06] to-white/[0.02]',
    videos: [
      { id: 'cf1', title: 'BELIEVE IN YOURSELF - Motivational Speech', youtubeId: 'FTnCMxN_JCY', channel: 'Motiversity' },
      { id: 'cf2', title: 'SELF CONFIDENCE - Powerful Motivation', youtubeId: 'w-HYZv6HzAs', channel: 'MotivationHub' },
      { id: 'cf3', title: 'KNOW YOUR WORTH - Motivational Video', youtubeId: 'sPaJTS33Qzc', channel: 'Motiversity' },
      { id: 'cf4', title: 'OWN YOUR POWER - Motivational Speech', youtubeId: 'lq_BvBpVeG8', channel: 'Motiversity' },
      { id: 'cf5', title: 'YOU ARE ENOUGH - Powerful Speech', youtubeId: 'Rj_n7R0gptU', channel: 'Absolute Motivation' },
      { id: 'cf6', title: 'BUILD UNSHAKEABLE CONFIDENCE', youtubeId: 'mK68F6YFkrQ', channel: 'MotivationHub' },
      { id: 'cf7', title: 'TRUST YOURSELF - Motivation', youtubeId: 'FN7ao8dSEUE', channel: 'T&H Inspiration' },
      { id: 'cf8', title: 'SELF BELIEF - Powerful Motivation', youtubeId: 'YKfV9GH4qYQ', channel: 'Motiversity' },
    ],
  },
]

// Seeded random number generator (consistent for same seed)
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Shuffle array with seed (Fisher-Yates)
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Get shuffled backgrounds for today (different each day, same for all users)
function getTodaysBackgrounds() {
  const now = new Date()
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  return shuffleWithSeed(BACKGROUND_IMAGES, dateSeed + 777) // different seed than videos
}

// Get today's topic based on date (rotates through topics)
function getTodaysTopic() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))

  // Get the topic for today
  const topic = DAILY_TOPICS[dayOfYear % DAILY_TOPICS.length]

  // Create a seed from the date (same seed = same selection for all users)
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()

  // Shuffle videos and take random amount (5-10)
  const shuffledVideos = shuffleWithSeed(topic.videos, dateSeed)
  const numVideos = 5 + Math.floor(seededRandom(dateSeed + 999) * 6) // 5 to 10 videos

  return {
    ...topic,
    videos: shuffledVideos.slice(0, numVideos)
  }
}

// Benefit types for voice guides
type VoiceGuideBenefit = 'calm' | 'confidence' | 'peace' | 'rest' | 'grounding'

const VOICE_GUIDE_BENEFITS: Record<VoiceGuideBenefit, { label: string; color: string }> = {
  calm: { label: 'Calm', color: 'text-blue-400' },
  confidence: { label: 'Confidence', color: 'text-amber-400' },
  peace: { label: 'Peace', color: 'text-teal-400' },
  rest: { label: 'Rest', color: 'text-purple-400' },
  grounding: { label: 'Grounding', color: 'text-green-400' },
}

// Guided voice types with rich content
const VOICE_GUIDES = [
  {
    id: 'breathing',
    name: 'Breathing',
    theme: 'CALM',
    tagline: 'Center your mind',
    preview: '"Breathe in slowly... hold... and release..."',
    icon: Wind,
    color: 'from-white/[0.05] to-white/[0.02]',
    iconColor: 'text-white',
    benefit: 'calm' as VoiceGuideBenefit,
    benefitValue: 3,
  },
  {
    id: 'affirmation',
    name: 'Affirmations',
    theme: 'CONFIDENCE',
    tagline: 'Build self-belief',
    preview: '"You are capable of achieving great things..."',
    icon: Sparkles,
    color: 'from-white/[0.05] to-white/[0.02]',
    iconColor: 'text-white',
    benefit: 'confidence' as VoiceGuideBenefit,
    benefitValue: 2,
  },
  {
    id: 'gratitude',
    name: 'Gratitude',
    theme: 'PEACE',
    tagline: 'Appreciate the moment',
    preview: '"Take a moment to reflect on what you\'re thankful for..."',
    icon: Heart,
    color: 'from-white/[0.05] to-white/[0.02]',
    iconColor: 'text-white',
    benefit: 'peace' as VoiceGuideBenefit,
    benefitValue: 2,
  },
  {
    id: 'sleep',
    name: 'Sleep',
    theme: 'REST',
    tagline: 'Drift into peaceful sleep',
    preview: '"Let your body relax... release all tension..."',
    icon: Moon,
    color: 'from-white/[0.05] to-white/[0.02]',
    iconColor: 'text-white',
    benefit: 'rest' as VoiceGuideBenefit,
    benefitValue: 3,
  },
  {
    id: 'anxiety',
    name: 'Grounding',
    theme: 'ANCHOR',
    tagline: 'Find your center',
    preview: '"Notice 5 things you can see... 4 things you can touch..."',
    icon: Anchor,
    color: 'from-white/[0.05] to-white/[0.02]',
    iconColor: 'text-white',
    benefit: 'grounding' as VoiceGuideBenefit,
    benefitValue: 3,
  },
]

// Music genre rotation order and display info
const MUSIC_GENRES = [
  { id: 'lofi', word: 'Lo-Fi', tagline: 'Chill beats to relax', color: 'from-white/[0.06] to-white/[0.02]' },
  { id: 'piano', word: 'Piano', tagline: 'Peaceful keys', color: 'from-white/[0.06] to-white/[0.02]' },
  { id: 'jazz', word: 'Jazz', tagline: 'Smooth vibes', color: 'from-white/[0.06] to-white/[0.02]' },
  { id: 'classical', word: 'Classical', tagline: 'Timeless elegance', color: 'from-white/[0.06] to-white/[0.02]' },
  { id: 'ambient', word: 'Ambient', tagline: 'Atmospheric soundscapes', color: 'from-white/[0.06] to-white/[0.02]' },
  { id: 'study', word: 'Study', tagline: 'Focus music', color: 'from-white/[0.06] to-white/[0.02]' },
]

// Get today's music genre based on date (rotates through genres)
function getTodaysMusicGenre() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return MUSIC_GENRES[dayOfYear % MUSIC_GENRES.length]
}

export default function DiscoverPage() {
  const themeContext = useThemeOptional()
  const [activeTab, setActiveTab] = useState<TabType>('motivation')
  const [playingSound, setPlayingSound] = useState<{
    id: string
    word: string
    color: string
    youtubeId: string
    script: string
    backgroundImage?: string
    showRain?: boolean
  } | null>(null)
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null)
  const [playingVoice, setPlayingVoice] = useState<{ script: string; audioUrl: string; color: string; type: string; genre?: string } | null>(null)

  // Inline guide playback state
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null)
  const guideAudioRef = useRef<HTMLAudioElement | null>(null)
  const [guideIsPlaying, setGuideIsPlaying] = useState(false)
  const [guideProgress, setGuideProgress] = useState(0)
  const [guideDuration, setGuideDuration] = useState(0)
  const [guideCurrentTime, setGuideCurrentTime] = useState(0)
  const guideProgressInterval = useRef<NodeJS.Timeout | null>(null)

  const stopPlaying = () => {
    setPlayingSound(null)
    setPlayingVoice(null)
  }

  const generateCalmingVoice = async (type: string, color: string) => {
    // Map old type names to new ones
    const typeMap: Record<string, string> = {
      'anxiety': 'grounding',
    }
    const mappedType = typeMap[type] || type

    setLoadingVoice(type)
    try {
      // Use new daily voices API (generates once per day, fetches from DB)
      const response = await fetch('/api/daily-guide/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mappedType }),
      })
      const data = await response.json()

      if (data.audioBase64) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioBase64}`
        setPlayingVoice({ script: data.script, audioUrl, color, type, genre: themeContext?.genre || 'lofi' })
      } else if (data.script) {
        setPlayingVoice({ script: data.script, audioUrl: '', color, type, genre: themeContext?.genre || 'lofi' })
      }
    } catch (error) {
      console.error('Failed to fetch calming voice:', error)
    } finally {
      setLoadingVoice(null)
    }
  }

  // Format time for inline guide player
  const formatGuideTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Stop inline guide audio
  const stopGuideAudio = () => {
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    if (guideProgressInterval.current) {
      clearInterval(guideProgressInterval.current)
    }
    setActiveGuideId(null)
    setGuideIsPlaying(false)
    setGuideProgress(0)
    setGuideDuration(0)
    setGuideCurrentTime(0)
  }

  // Play guide audio inline in card
  const playGuideInline = async (guideId: string) => {
    // If already active, toggle play/pause
    if (activeGuideId === guideId && guideAudioRef.current) {
      if (guideIsPlaying) {
        guideAudioRef.current.pause()
        setGuideIsPlaying(false)
      } else {
        guideAudioRef.current.play()
        setGuideIsPlaying(true)
      }
      return
    }

    // Stop any currently playing guide
    stopGuideAudio()

    setActiveGuideId(guideId)
    setLoadingVoice(guideId)

    try {
      const typeMap: Record<string, string> = { 'anxiety': 'grounding' }
      const mappedType = typeMap[guideId] || guideId

      const response = await fetch('/api/daily-guide/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mappedType }),
      })
      const data = await response.json()

      if (data.audioBase64) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioBase64}`
        const audio = new Audio(audioUrl)
        guideAudioRef.current = audio

        audio.oncanplaythrough = () => {
          setGuideDuration(audio.duration)
          setLoadingVoice(null)
          audio.play()
            .then(() => setGuideIsPlaying(true))
            .catch(err => console.error('Guide audio play error:', err))
        }

        audio.onended = () => {
          setGuideIsPlaying(false)
          setGuideProgress(100)
        }

        audio.onerror = () => {
          console.error('Guide audio error')
          setLoadingVoice(null)
          setActiveGuideId(null)
        }

        guideProgressInterval.current = setInterval(() => {
          if (guideAudioRef.current && !isNaN(guideAudioRef.current.duration)) {
            const curr = guideAudioRef.current.currentTime
            const dur = guideAudioRef.current.duration
            setGuideCurrentTime(curr)
            if (dur > 0) {
              setGuideProgress((curr / dur) * 100)
            }
          }
        }, 200)
      } else {
        setLoadingVoice(null)
      }
    } catch (error) {
      console.error('Failed to fetch guide audio:', error)
      setLoadingVoice(null)
      setActiveGuideId(null)
    }
  }

  // Seek inline guide audio
  const handleGuideSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (guideAudioRef.current && guideDuration > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percent = clickX / rect.width
      const seekTime = percent * guideDuration
      guideAudioRef.current.currentTime = seekTime
      setGuideCurrentTime(seekTime)
      setGuideProgress(percent * 100)
    }
  }

  // Stop inline guide when fullscreen players activate
  useEffect(() => {
    if (playingSound || playingVoice) {
      stopGuideAudio()
    }
  }, [playingSound, playingVoice])

  // Cleanup guide audio on unmount
  useEffect(() => {
    return () => {
      if (guideAudioRef.current) {
        guideAudioRef.current.pause()
        guideAudioRef.current.src = ''
      }
      if (guideProgressInterval.current) {
        clearInterval(guideProgressInterval.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#08080c] text-white pb-24">
      {/* Sound Player */}
      {playingSound && (
        <WordAnimationPlayer
          word={playingSound.word}
          script={playingSound.script}
          color={playingSound.color}
          youtubeId={playingSound.youtubeId}
          backgroundImage={playingSound.backgroundImage}
          showRain={playingSound.showRain}
          onClose={stopPlaying}
        />
      )}

      {/* Voice Player */}
      {playingVoice && (
        <VoicePlayer
          script={playingVoice.script}
          audioUrl={playingVoice.audioUrl}
          color={playingVoice.color}
          type={playingVoice.type}
          genre={playingVoice.genre}
          onClose={stopPlaying}
        />
      )}

      {/* Header */}
      <div className="px-6 pt-12 pb-6 animate-fade-in-down">
        <h1 className="text-2xl font-light text-white">Discover</h1>
        <p className="text-white/60 text-sm mt-1">Curated sounds for your mind</p>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-6">
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl overflow-x-auto">
          {[
            { id: 'motivation', label: 'Motivation' },
            { id: 'guided', label: 'Guided' },
            { id: 'music', label: 'Music' },
            { id: 'saved', label: 'Saved' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        {activeTab === 'motivation' && (
          <DailyMotivationTab onPlayVideo={(video, topic, index) => {
            const backgrounds = getTodaysBackgrounds()
            setPlayingSound({
              id: video.id,
              word: topic.word,
              color: topic.color,
              youtubeId: video.youtubeId,
              script: '',
              backgroundImage: backgrounds[index % backgrounds.length],
              showRain: false,
            })
          }} />
        )}

        {activeTab === 'guided' && (
          <div className="space-y-4">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-4">AI Voice Guides</p>
            <div className="space-y-3">
              {VOICE_GUIDES.map((guide, index) => {
                const Icon = guide.icon
                const benefit = VOICE_GUIDE_BENEFITS[guide.benefit]
                const isLoading = loadingVoice === guide.id
                const isActive = activeGuideId === guide.id
                const isThisPlaying = isActive && guideIsPlaying
                const isFinished = isActive && guideProgress >= 100 && !guideIsPlaying

                return (
                  <div
                    key={guide.id}
                    className={`w-full rounded-2xl bg-gradient-to-br ${guide.color} border overflow-hidden transition-all animate-fade-in opacity-0 stagger-${Math.min(index + 1, 10)} ${
                      isActive ? 'border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.1)]' : 'border-white/10'
                    }`}
                  >
                    {/* Theme Header */}
                    <div className="px-4 pt-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <h2 className="text-sm font-semibold tracking-wider text-white/90">
                            {guide.theme}
                          </h2>
                          <p className="text-xs text-white/50">
                            {guide.tagline}
                          </p>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 ${benefit.color}`}>
                          <Icon className="w-3 h-3" />
                          <span className="text-xs font-medium">+{guide.benefitValue}</span>
                        </div>
                      </div>
                    </div>

                    {/* Preview - hide when active to save space */}
                    {!isActive && (
                      <div className="px-4 py-3 text-left">
                        <p className="text-sm text-white/80 leading-relaxed line-clamp-2">
                          {guide.preview}
                        </p>
                      </div>
                    )}

                    {/* Footer with play controls */}
                    <div className="px-4 pb-4 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => playGuideInline(guide.id)}
                            disabled={isLoading || (loadingVoice !== null && loadingVoice !== guide.id)}
                            className={`p-2.5 rounded-xl transition-all ${
                              isLoading ? 'bg-white/15 animate-pulse-glow' :
                              isThisPlaying ? 'bg-white/20' :
                              'bg-white/10 hover:bg-white/15'
                            } disabled:opacity-50`}
                          >
                            {isLoading ? (
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : isThisPlaying ? (
                              <Pause className="w-5 h-5 text-white" fill="white" />
                            ) : (
                              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                            )}
                          </button>
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">
                              {guide.name}
                            </p>
                            <span className="text-xs text-white/50">
                              {isLoading ? 'Loading...' :
                               isThisPlaying ? 'Playing' :
                               isFinished ? 'Complete' :
                               isActive ? 'Paused' :
                               'AI generated daily'}
                            </span>
                          </div>
                        </div>
                        {isActive && !isLoading ? (
                          <button
                            onClick={stopGuideAudio}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
                          >
                            <X className="w-4 h-4 text-white/60" />
                          </button>
                        ) : !isActive && (
                          <button
                            onClick={() => playGuideInline(guide.id)}
                            disabled={loadingVoice !== null}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50"
                          >
                            <Play className="w-4 h-4 text-white" fill="white" />
                          </button>
                        )}
                      </div>

                      {/* Inline progress bar when active */}
                      {isActive && !isLoading && (
                        <div className="mt-3">
                          <div
                            className="h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                            onClick={handleGuideSeek}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-200 bg-white/60"
                              style={{ width: `${guideProgress}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1.5 text-white/50 text-xs">
                            <span>{formatGuideTime(guideCurrentTime)}</span>
                            <span>{guideDuration > 0 ? formatGuideTime(guideDuration) : '--:--'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'music' && (
          <DailyMusicTab
            preferredGenre={themeContext?.genre}
            onPlayVideo={async (video, genre, index) => {
              console.log('[Music] Playing video for genre:', genre.id)
              // Fetch backgrounds from Supabase Storage
              const backgrounds = await fetchVoicePlayerBackgrounds(genre.id)
              const randomBg = backgrounds.length > 0
                ? backgrounds[index % backgrounds.length]
                : undefined
              console.log('[Music] Setting backgroundImage:', randomBg)
              setPlayingSound({
                id: video.id,
                word: genre.word,
                color: genre.color,
                youtubeId: video.youtubeId,
                script: '',
                backgroundImage: randomBg,
                showRain: false,
              })
            }}
          />
        )}

        {activeTab === 'saved' && (
          <SavedTab
            onPlayVoice={(type, color) => generateCalmingVoice(type, color)}
          />
        )}
      </div>
    </div>
  )
}

// Cache for fetched background images per genre
const voicePlayerBackgroundsCache: Map<string, string[]> = new Map()

// Fetch backgrounds for a genre from Supabase Storage
async function fetchVoicePlayerBackgrounds(genre: string): Promise<string[]> {
  if (voicePlayerBackgroundsCache.has(genre)) {
    console.log(`[VoicePlayer] Using cached ${genre}:`, voicePlayerBackgroundsCache.get(genre)!.length, 'images')
    return voicePlayerBackgroundsCache.get(genre)!
  }

  try {
    console.log(`[VoicePlayer] Fetching ${genre} from API...`)
    const response = await fetch(`/api/backgrounds?genre=${genre}`)
    if (response.ok) {
      const data = await response.json()
      const urls = data.images?.map((img: { url: string }) => img.url) || []
      console.log(`[VoicePlayer] Got ${urls.length} images for ${genre}`)
      if (urls.length > 0) {
        console.log(`[VoicePlayer] First URL:`, urls[0])
      }
      voicePlayerBackgroundsCache.set(genre, urls)
      return urls
    } else {
      console.error(`[VoicePlayer] API error:`, response.status)
    }
  } catch (error) {
    console.error('[VoicePlayer] Fetch error:', error)
  }
  return []
}

// Voice Player Component with Word-by-Word Captions
function VoicePlayer({
  script,
  audioUrl,
  color,
  type,
  genre,
  onClose,
}: {
  script: string
  audioUrl: string
  color: string
  type: string
  genre?: string
  onClose: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)

  // Set background based on genre - fetch from Supabase Storage
  useEffect(() => {
    let isMounted = true
    console.log('[VoicePlayer] useEffect genre:', genre)
    if (genre) {
      fetchVoicePlayerBackgrounds(genre).then((backgrounds) => {
        if (!isMounted) return
        console.log('[VoicePlayer] Got backgrounds for', genre, ':', backgrounds.length)
        if (backgrounds.length > 0) {
          const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)]
          console.log('[VoicePlayer] Setting background:', randomBg)
          setBackgroundImage(randomBg)
        } else {
          console.log('[VoicePlayer] No backgrounds to set')
        }
      })
    }
    return () => {
      isMounted = false
    }
  }, [genre])

  // Play ElevenLabs audio only
  useEffect(() => {
    if (!audioUrl) {
      setIsLoading(false)
      return
    }

    const audio = new Audio(audioUrl)
    audioRef.current = audio

    audio.oncanplaythrough = () => {
      setIsLoading(false)
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Audio play error:', err))
    }

    audio.onended = () => setIsPlaying(false)
    audio.onerror = () => {
      console.error('Audio loading error')
      setIsLoading(false)
    }

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [audioUrl])

  const titles: Record<string, string> = {
    breathing: 'Breathing',
    affirmation: 'Affirmations',
    meditation: 'Body Scan',
    gratitude: 'Gratitude',
    sleep: 'Sleep',
    anxiety: 'Grounding',
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-[#08080c]"
    >
      {/* Background image based on theme */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-full object-cover"
            onLoad={() => console.log('[VoicePlayer] Image loaded successfully:', backgroundImage)}
            onError={(e) => {
              console.error('[VoicePlayer] Image failed to load:', backgroundImage)
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/60" />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
        </div>
      )}

      {/* Close button */}
      <div className="absolute top-4 right-4 z-20">
        <button onClick={onClose} className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <X className="w-6 h-6 text-white/80" />
        </button>
      </div>

      {/* Main content */}
      <div className="h-full flex flex-col items-center justify-center px-6 relative z-10">
        {/* Title */}
        <p className="text-white/50 text-sm uppercase tracking-widest mb-6">
          {titles[type] || 'Guided Audio'}
        </p>

        {/* Playing indicator */}
        {isPlaying && (
          <div className="flex items-center justify-center gap-1 mb-8">
            <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
            <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        )}

        {/* Status text */}
        <p className="text-white/70 text-lg">
          {isLoading ? 'Loading...' : !isPlaying ? 'Session complete' : ''}
        </p>
      </div>
    </div>
  )
}

// Get today's date key for caching
function getTodayDateKey() {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

// Daily Motivation Tab Component
function DailyMotivationTab({
  onPlayVideo
}: {
  onPlayVideo: (video: { id: string; title: string; youtubeId: string; channel: string }, topic: typeof DAILY_TOPICS[0], index: number) => void
}) {
  const [topic, setTopic] = useState(getTodaysTopic())
  const [apiVideos, setApiVideos] = useState<Array<{ id: string; title: string; youtubeId: string; channel: string; thumbnail?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [useApi, setUseApi] = useState(true)

  // Fetch videos from YouTube API - with daily caching
  useEffect(() => {
    let isMounted = true

    async function fetchVideos() {
      const cacheKey = `voxu_motivation_${topic.word}`
      const dateKey = getTodayDateKey()

      // Check localStorage cache first (only in browser)
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            const { date, videos } = JSON.parse(cached)
            if (date === dateKey && videos && videos.length > 0) {
              console.log('[Motivation] Using cached videos for', topic.word)
              if (isMounted) {
                setApiVideos(videos)
                setUseApi(true)
                setLoading(false)
              }
              return
            }
          }
        } catch (e) {
          console.error('[Motivation] Cache read error:', e)
        }
      }

      // Fetch from API
      if (isMounted) setLoading(true)
      try {
        console.log('[Motivation] Fetching fresh videos for', topic.word)
        const response = await fetch(`/api/motivation-videos?topic=${topic.word}`)
        const data = await response.json()
        if (!isMounted) return
        if (data.videos && data.videos.length > 0) {
          setApiVideos(data.videos)
          setUseApi(true)
          // Cache for today (only in browser)
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, JSON.stringify({ date: dateKey, videos: data.videos }))
            } catch (e) {
              console.error('[Motivation] Cache write error:', e)
            }
          }
        } else {
          // Fallback to static list
          setUseApi(false)
        }
      } catch (error) {
        console.error('Failed to fetch videos:', error)
        if (isMounted) setUseApi(false)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchVideos()

    return () => {
      isMounted = false
    }
  }, [topic.word])

  // Update topic at midnight
  useEffect(() => {
    const checkForNewDay = () => {
      const newTopic = getTodaysTopic()
      if (newTopic.word !== topic.word) {
        setTopic(newTopic)
      }
    }
    const interval = setInterval(checkForNewDay, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [topic.word])

  const videos = useApi ? apiVideos : topic.videos

  return (
    <div className="space-y-6">
      {/* Daily Theme Header */}
      <div className={`p-6 rounded-3xl bg-gradient-to-br ${topic.color} relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1),0_0_60px_rgba(255,255,255,0.05)] animate-scale-in animate-glow-pulse`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative">
          <p className="text-white/70 text-xs uppercase tracking-widest mb-2">Today's Theme</p>
          <h2 className="text-4xl font-bold text-white mb-2">{topic.word}</h2>
          <p className="text-white/80 text-sm">{topic.tagline}</p>
          <div className="flex items-center gap-2 mt-4">
            <div className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs">
              {loading ? '...' : videos.length} videos
            </div>
            <div className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs">
              {useApi ? 'Live from YouTube' : 'Quick motivation'}
            </div>
          </div>
        </div>
      </div>

      {/* Videos List */}
      <div>
        <p className="text-white/50 text-xs uppercase tracking-wider mb-4">Choose a video</p>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10" />
                  <div className="flex-1">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video, index) => (
              <button
                key={video.id}
                onClick={() => onPlayVideo(video, topic, index)}
                className={`w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 transition-all hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] text-left flex items-center gap-4 animate-fade-in opacity-0 stagger-${Math.min(index + 1, 10)} hover-lift`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${topic.color} flex items-center justify-center flex-shrink-0`}>
                  <Play className="w-4 h-4 text-white" fill="white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white text-sm truncate">{video.title}</h3>
                  <p className="text-white/60 text-xs mt-0.5">{video.channel}</p>
                </div>
                <span className="text-white/60 text-xs">{index + 1}/{videos.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tomorrow preview */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
        <p className="text-white/60 text-xs text-center">
          Tomorrow's theme: <span className="text-white/80 font-medium">
            {DAILY_TOPICS[(DAILY_TOPICS.findIndex(t => t.word === topic.word) + 1) % DAILY_TOPICS.length].word}
          </span>
        </p>
      </div>
    </div>
  )
}

// Daily Music Tab Component
function DailyMusicTab({
  onPlayVideo,
  preferredGenre,
}: {
  onPlayVideo: (video: { id: string; title: string; youtubeId: string; channel: string }, genre: typeof MUSIC_GENRES[0], index: number) => void
  preferredGenre?: string
}) {
  // Use preferred genre if available, otherwise daily rotation
  const getGenreFromPreference = (pref?: string) => {
    if (pref) {
      const found = MUSIC_GENRES.find(g => g.id === pref)
      if (found) return found
    }
    return getTodaysMusicGenre()
  }
  const [genre, setGenre] = useState(() => getGenreFromPreference(preferredGenre))
  const [apiVideos, setApiVideos] = useState<Array<{ id: string; title: string; youtubeId: string; channel: string; thumbnail?: string; duration?: number }>>([])
  const [loading, setLoading] = useState(true)

  // Fetch videos from YouTube API - with daily caching
  useEffect(() => {
    let isMounted = true

    async function fetchVideos() {
      const cacheKey = `voxu_music_${genre.id}`
      const dateKey = getTodayDateKey()

      // Check localStorage cache first (only in browser)
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            const { date, videos } = JSON.parse(cached)
            if (date === dateKey && videos && videos.length > 0) {
              console.log('[Music] Using cached videos for', genre.id)
              if (isMounted) {
                setApiVideos(videos)
                setLoading(false)
              }
              return
            }
          }
        } catch (e) {
          console.error('[Music] Cache read error:', e)
        }
      }

      // Fetch from API
      if (isMounted) setLoading(true)
      try {
        console.log('[Music] Fetching fresh videos for', genre.id)
        const response = await fetch(`/api/music-videos?genre=${genre.id}`)
        const data = await response.json()
        if (!isMounted) return
        if (data.videos && data.videos.length > 0) {
          setApiVideos(data.videos)
          // Cache for today (only in browser)
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, JSON.stringify({ date: dateKey, videos: data.videos }))
            } catch (e) {
              console.error('[Music] Cache write error:', e)
            }
          }
        } else {
          setApiVideos([])
        }
      } catch (error) {
        console.error('Failed to fetch music videos:', error)
        if (isMounted) setApiVideos([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchVideos()

    return () => {
      isMounted = false
    }
  }, [genre.id])

  // Sync genre when preferredGenre prop changes (e.g. ThemeContext loads)
  useEffect(() => {
    if (preferredGenre) {
      const found = MUSIC_GENRES.find(g => g.id === preferredGenre)
      if (found && found.id !== genre.id) {
        setGenre(found)
      }
    }
  }, [preferredGenre])

  // Update genre at midnight - only when no user preference is set
  useEffect(() => {
    if (preferredGenre) return // User has a preference, don't override with rotation

    let lastDay = new Date().getDate()
    const checkForNewDay = () => {
      const currentDay = new Date().getDate()
      if (currentDay !== lastDay) {
        lastDay = currentDay
        const newGenre = getTodaysMusicGenre()
        setGenre(newGenre)
      }
    }
    const interval = setInterval(checkForNewDay, 60000)
    return () => clearInterval(interval)
  }, [preferredGenre])

  // Format duration to mm:ss
  const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Daily Genre Header */}
      <div className={`p-6 rounded-3xl bg-gradient-to-br ${genre.color} relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1),0_0_60px_rgba(255,255,255,0.05)] animate-scale-in animate-glow-pulse`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative">
          <p className="text-white/70 text-xs uppercase tracking-widest mb-2">Today's Genre</p>
          <h2 className="text-4xl font-bold text-white mb-2">{genre.word}</h2>
          <p className="text-white/80 text-sm">{genre.tagline}</p>
          <div className="flex items-center gap-2 mt-4">
            <div className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs">
              {loading ? '...' : apiVideos.length} tracks
            </div>
            <div className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs">
              Live from YouTube
            </div>
          </div>
        </div>
      </div>

      {/* Music Videos List */}
      <div>
        <p className="text-white/50 text-xs uppercase tracking-wider mb-4">Choose a track</p>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10" />
                  <div className="flex-1">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : apiVideos.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/5 border border-white/5 text-center">
            <p className="text-white/60">No tracks available. Check back later.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiVideos.map((video, index) => (
              <button
                key={video.id}
                onClick={() => onPlayVideo(video, genre, index)}
                className={`w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 transition-all hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] text-left flex items-center gap-4 animate-fade-in opacity-0 stagger-${Math.min(index + 1, 10)} hover-lift`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${genre.color} flex items-center justify-center flex-shrink-0`}>
                  <Play className="w-4 h-4 text-white" fill="white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white text-sm truncate">{video.title}</h3>
                  <p className="text-white/60 text-xs mt-0.5">{video.channel}</p>
                </div>
                <div className="text-right">
                  {video.duration && (
                    <span className="text-white/50 text-xs block">{formatDuration(video.duration)}</span>
                  )}
                  <span className="text-white/40 text-xs">{index + 1}/{apiVideos.length}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tomorrow preview */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/5">
        <p className="text-white/60 text-xs text-center">
          Tomorrow's genre: <span className="text-white/80 font-medium">
            {MUSIC_GENRES[(MUSIC_GENRES.findIndex(g => g.id === genre.id) + 1) % MUSIC_GENRES.length].word}
          </span>
        </p>
      </div>
    </div>
  )
}

// Saved / Content Library Tab (Feature 9)
type SavedFilter = 'all' | 'quote' | 'journal' | 'breathing'

interface FavoriteItem {
  id: string
  content_type: string
  content_text: string
  created_at: string
}

function SavedTab({ onPlayVoice }: { onPlayVoice: (type: string, color: string) => void }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<SavedFilter>('all')

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/favorites')
      if (response.ok) {
        const data = await response.json()
        setFavorites(data.favorites || [])
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (response.ok) {
        setFavorites(prev => prev.filter(f => f.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete favorite:', error)
    }
  }

  const filtered = filter === 'all'
    ? favorites
    : favorites.filter(f => f.content_type === filter)

  const filters: { id: SavedFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'quote', label: 'Quotes' },
    { id: 'journal', label: 'Journals' },
    { id: 'breathing', label: 'Breathing' },
  ]

  return (
    <div className="space-y-4">
      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              filter === f.id
                ? 'bg-white/15 text-white border border-white/20'
                : 'bg-white/5 text-white/60 border border-transparent hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm">
            {filter === 'all' ? 'No saved items yet' : `No saved ${filter}s`}
          </p>
          <p className="text-white/30 text-xs mt-1">
            Tap the heart icon on quotes or voice guides to save them
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      item.content_type === 'quote' ? 'bg-amber-500/20 text-amber-400' :
                      item.content_type === 'breathing' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {item.content_type}
                    </span>
                    <span className="text-[10px] text-white/30">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {item.content_text}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {item.content_type === 'breathing' && (
                    <button
                      onClick={() => onPlayVoice('breathing', 'from-white/[0.05] to-white/[0.02]')}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      title="Replay"
                    >
                      <Play className="w-3.5 h-3.5 text-white/60" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
