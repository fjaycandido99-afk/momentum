export type ExtendedMood = 'Stressed' | 'Tired' | 'Anxious' | 'Energized' | 'Happy' | 'Neutral'

export interface MoodRecommendation {
  soundscape: string
  musicGenre: string
  breathing: string
  motivationTopic: string
}

export const MOOD_ICONS: Record<ExtendedMood, string> = {
  Stressed: '😤',
  Tired: '😴',
  Anxious: '😰',
  Energized: '⚡',
  Happy: '😊',
  Neutral: '😌',
}

export const MOOD_COLORS: Record<ExtendedMood, string> = {
  Stressed: 'from-red-500/20 to-orange-500/20 border-red-500/30',
  Tired: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
  Anxious: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
  Energized: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  Happy: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  Neutral: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
}

export const MOOD_MAP: Record<ExtendedMood, MoodRecommendation> = {
  Stressed: {
    soundscape: 'relax',
    musicGenre: 'piano',
    breathing: '4-7-8',
    motivationTopic: 'Resilience',
  },
  Tired: {
    soundscape: 'energy',
    musicGenre: 'lofi',
    breathing: 'box',
    motivationTopic: 'Discipline',
  },
  Anxious: {
    soundscape: 'sleep',
    musicGenre: 'ambient',
    breathing: '4-7-8',
    motivationTopic: 'Courage',
  },
  Energized: {
    soundscape: 'focus',
    musicGenre: 'study',
    breathing: 'energize',
    motivationTopic: 'Hustle',
  },
  Happy: {
    soundscape: 'relax',
    musicGenre: 'jazz',
    breathing: 'resonance',
    motivationTopic: 'Confidence',
  },
  Neutral: {
    soundscape: 'focus',
    musicGenre: 'classical',
    breathing: 'box',
    motivationTopic: 'Mindset',
  },
}

export const EXTENDED_MOODS: ExtendedMood[] = ['Stressed', 'Tired', 'Anxious', 'Energized', 'Happy', 'Neutral']
