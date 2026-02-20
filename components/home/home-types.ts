import { Wind, Sparkles, Heart, Moon, Anchor, Leaf, Target, HeartHandshake, Shield } from 'lucide-react'

// --- Shared types ---

export type Mode = 'focus' | 'relax' | 'sleep' | 'energy'

export type { ExtendedMood } from '@/lib/mood-recommendations'

export interface VideoItem {
  id: string
  title: string
  youtubeId: string
  channel: string
  thumbnail?: string
  duration?: number
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
  { id: 'sleep', word: 'Sleep', tagline: 'Drift into rest' },
]

export const VOICE_GUIDES = [
  { id: 'breathing', name: 'Breathing', tagline: 'Center your mind', icon: Wind, color: 'from-sky-500/40 to-cyan-500/40' },
  { id: 'affirmation', name: 'Affirmations', tagline: 'Build self-belief', icon: Sparkles, color: 'from-violet-500/40 to-purple-500/40' },
  { id: 'gratitude', name: 'Gratitude', tagline: 'Appreciate the moment', icon: Heart, color: 'from-rose-500/40 to-pink-500/40' },
  { id: 'sleep', name: 'Sleep', tagline: 'Peaceful sleep', icon: Moon, color: 'from-slate-500/40 to-indigo-500/40' },
  { id: 'anxiety', name: 'Grounding', tagline: 'Find your center', icon: Anchor, color: 'from-emerald-500/40 to-teal-500/40' },
  { id: 'stress_relief', name: 'Stress Relief', tagline: 'Let go of tension', icon: Leaf, color: 'from-teal-500/40 to-emerald-500/40' },
  { id: 'focus_meditation', name: 'Focus', tagline: 'Sharpen your mind', icon: Target, color: 'from-blue-500/40 to-cyan-500/40' },
  { id: 'self_compassion', name: 'Self-Love', tagline: 'Be kind to yourself', icon: HeartHandshake, color: 'from-rose-500/40 to-pink-500/40' },
  { id: 'confidence', name: 'Confidence', tagline: 'Stand in your power', icon: Shield, color: 'from-yellow-500/40 to-amber-500/40' },
]

// Centralized valid soundscape IDs — used by smart-session API validation and anywhere else
export const VALID_SOUNDSCAPE_IDS = ['focus', 'relax', 'sleep', 'energy', 'rain', 'ocean', 'forest', 'fire', 'thunder', 'night', 'wind', 'stream', 'cafe', 'piano', 'cosmic', 'astral', 'starlight'] as const


export const BACKGROUND_IMAGES = [4,5,6,7,8,9,10,11,12,13,14,15,16,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map(i => `/backgrounds/bg${i}.jpg`)

// Static genre background URLs — guarantees images show without API dependency
const _SB = 'https://jkrpreixylczfdfdyxrm.supabase.co'
const _bg = (genre: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${_SB}/storage/v1/object/public/backgrounds/${genre}/${genre}-${String(i + 1).padStart(2, '0')}.jpg`)

export const MUSIC_GENRE_BACKGROUNDS: Record<string, string[]> = {
  lofi: _bg('lofi', 17),
  piano: _bg('piano', 42),
  classical: _bg('classical', 42),
  jazz: _bg('jazz', 10),
}

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

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes} min`
}

const MOOD_TOPIC_MAP: Record<string, string[]> = {
  awful: ['Resilience', 'Courage'],
  low: ['Resilience', 'Courage'],
  okay: ['Mindset', 'Focus'],
  good: ['Hustle', 'Discipline', 'Confidence'],
  great: ['Hustle', 'Discipline', 'Confidence'],
}

export function getMoodTopicName(journalMood: string | null | undefined): string | null {
  if (!journalMood) return null
  const options = MOOD_TOPIC_MAP[journalMood]
  if (!options || options.length === 0) return null
  // Deterministic daily pick: use day-of-year to pick from options
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
  return options[dayOfYear % options.length]
}
