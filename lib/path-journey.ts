import type { MindsetId } from '@/lib/mindset/types'

export type PathActivity = 'reflection' | 'exercise' | 'quote' | 'soundscape'

export const PATH_ACTIVITIES: { id: PathActivity; label: string; icon: string }[] = [
  { id: 'reflection', label: 'Reflection', icon: '💭' },
  { id: 'exercise', label: 'Exercise', icon: '🎯' },
  { id: 'quote', label: 'Quote', icon: '📜' },
  { id: 'soundscape', label: 'Soundscape', icon: '🎧' },
]

// Maps activity to DailyGuide boolean field name
export const PATH_FIELD_MAP: Record<PathActivity, string> = {
  reflection: 'path_reflection_done',
  exercise: 'path_exercise_done',
  quote: 'path_quote_viewed',
  soundscape: 'path_soundscape_played',
}

type NonScholarMindset = Exclude<MindsetId, 'scholar'>

export const RANK_TABLES: Record<NonScholarMindset, { title: string; minDays: number }[]> = {
  stoic: [
    { title: 'Apprentice', minDays: 0 },
    { title: 'Student', minDays: 7 },
    { title: 'Practitioner', minDays: 21 },
    { title: 'Sage', minDays: 60 },
  ],
  existentialist: [
    { title: 'Observer', minDays: 0 },
    { title: 'Questioner', minDays: 7 },
    { title: 'Seeker', minDays: 21 },
    { title: 'Authentic', minDays: 60 },
  ],
  cynic: [
    { title: 'Conformist', minDays: 0 },
    { title: 'Skeptic', minDays: 7 },
    { title: 'Challenger', minDays: 21 },
    { title: 'Liberated', minDays: 60 },
  ],
  hedonist: [
    { title: 'Taster', minDays: 0 },
    { title: 'Savorer', minDays: 7 },
    { title: 'Cultivator', minDays: 21 },
    { title: 'Epicurean', minDays: 60 },
  ],
  samurai: [
    { title: 'Recruit', minDays: 0 },
    { title: 'Disciple', minDays: 7 },
    { title: 'Warrior', minDays: 21 },
    { title: 'Ronin', minDays: 60 },
  ],
}

export function getPathRank(mindsetId: NonScholarMindset, totalPathDays: number): string {
  const ranks = RANK_TABLES[mindsetId]
  let current = ranks[0].title
  for (const rank of ranks) {
    if (totalPathDays >= rank.minDays) {
      current = rank.title
    } else {
      break
    }
  }
  return current
}

export const PATH_GRADIENTS: Record<NonScholarMindset, string> = {
  stoic: 'from-slate-800/60 to-slate-900/40',
  existentialist: 'from-violet-900/50 to-slate-900/40',
  cynic: 'from-orange-900/40 to-slate-900/40',
  hedonist: 'from-emerald-900/40 to-slate-900/40',
  samurai: 'from-red-900/40 to-slate-900/40',
}

export const PATH_ACCENT_COLORS: Record<NonScholarMindset, string> = {
  stoic: 'text-slate-300',
  existentialist: 'text-violet-300',
  cynic: 'text-orange-300',
  hedonist: 'text-emerald-300',
  samurai: 'text-red-300',
}

export const PATH_RING_COLORS: Record<NonScholarMindset, string> = {
  stoic: 'rgba(148,163,184,0.85)',
  existentialist: 'rgba(167,139,250,0.85)',
  cynic: 'rgba(251,146,60,0.85)',
  hedonist: 'rgba(52,211,153,0.85)',
  samurai: 'rgba(252,165,165,0.85)',
}

export interface PathStatus {
  reflection: boolean
  exercise: boolean
  quote: boolean
  soundscape: boolean
  completedCount: number
  streak: number
  totalDays: number
  rank: string
}
