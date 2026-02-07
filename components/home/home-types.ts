import { Wind, Sparkles, Heart, Moon, Anchor } from 'lucide-react'

// --- Shared types ---

export type Mode = 'focus' | 'relax' | 'sleep' | 'energy'

export type { ExtendedMood } from '@/lib/mood-recommendations'

export interface VideoItem {
  id: string
  title: string
  youtubeId: string
  channel: string
  thumbnail?: string
}

// --- Constants ---

export const TOPIC_NAMES = ['Discipline', 'Focus', 'Mindset', 'Courage', 'Resilience', 'Hustle', 'Confidence']

export const TOPIC_TAGLINES: Record<string, string> = {
  Discipline: 'Master yourself first',
  Focus: 'Eliminate distractions',
  Mindset: 'Your thoughts shape reality',
  Courage: 'Fear is the enemy of progress',
  Resilience: 'Get back up every time',
  Hustle: 'Outwork everyone',
  Confidence: 'Believe in yourself',
}

export const MUSIC_GENRES = [
  { id: 'lofi', word: 'Lo-Fi', tagline: 'Chill beats' },
  { id: 'classical', word: 'Classical', tagline: 'Timeless' },
  { id: 'piano', word: 'Piano', tagline: 'Peaceful keys' },
  { id: 'jazz', word: 'Jazz', tagline: 'Smooth vibes' },
  { id: 'study', word: 'Study', tagline: 'Focus music' },
  { id: 'ambient', word: 'Ambient', tagline: 'Atmospheric' },
]

export const VOICE_GUIDES = [
  { id: 'breathing', name: 'Breathing', tagline: 'Center your mind', icon: Wind },
  { id: 'affirmation', name: 'Affirmations', tagline: 'Build self-belief', icon: Sparkles },
  { id: 'gratitude', name: 'Gratitude', tagline: 'Appreciate the moment', icon: Heart },
  { id: 'sleep', name: 'Sleep', tagline: 'Peaceful sleep', icon: Moon },
  { id: 'anxiety', name: 'Grounding', tagline: 'Find your center', icon: Anchor },
]

export const BACKGROUND_IMAGES = [4,5,6,7,8,9,10,11,12,13,14,15,16,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map(i => `/backgrounds/bg${i}.jpg`)

// --- Helpers ---

export function getTimeContext() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 9) return { suggested: 'energy' as const, greeting: 'Good morning' }
  if (hour >= 9 && hour < 17) return { suggested: 'focus' as const, greeting: 'Good afternoon' }
  if (hour >= 17 && hour < 21) return { suggested: 'relax' as const, greeting: 'Good evening' }
  return { suggested: 'sleep' as const, greeting: 'Good night' }
}

export function getSuggestedMode(mood?: string | null, energy?: string | null, timeSuggested?: Mode): Mode {
  if (mood === 'low' && energy === 'low') return 'relax'
  if (mood === 'low' && energy === 'high') return 'focus'
  if (mood === 'low') return 'relax'
  if (mood === 'high' && energy === 'high') return 'energy'
  if (mood === 'high' && energy === 'low') return 'relax'
  if (mood === 'medium' && energy === 'high') return 'energy'
  if (mood === 'medium' && energy === 'low') return 'relax'
  if (energy === 'low') return 'sleep'
  if (energy === 'high') return 'energy'
  return timeSuggested || 'focus'
}

export function getTodaysTopicName() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  return TOPIC_NAMES[dayOfYear % TOPIC_NAMES.length]
}

export function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function getTodaysBackgrounds() {
  const now = new Date()
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  return shuffleWithSeed(BACKGROUND_IMAGES, dateSeed + 777)
}
