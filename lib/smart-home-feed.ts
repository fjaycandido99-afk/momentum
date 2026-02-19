/**
 * Smart Home Feed — Adaptive content ordering & recommendations
 *
 * Used by:
 * #1 Smart Flow Transitions (post-Daily Guide audio recommendation)
 * #2 Adaptive Home Feed (section reordering)
 * #5 Path-Driven Content Curation (mindset → topic mapping)
 * #8 Wellness Score Widget (client-side calculation)
 */

import type { MindsetId } from '@/lib/mindset/types'
import type { Mode } from '@/components/home/home-types'

// --- #5: Mindset → Topic Mapping ---

export const MINDSET_TOPIC_MAP: Record<MindsetId, string[]> = {
  stoic: ['Discipline', 'Resilience', 'Mindset'],
  existentialist: ['Courage', 'Mindset', 'Focus'],
  cynic: ['Discipline', 'Courage', 'Resilience'],
  hedonist: ['Confidence', 'Focus', 'Hustle'],
  samurai: ['Discipline', 'Courage', 'Resilience'],
  scholar: ['Mindset', 'Focus', 'Confidence'],
  manifestor: ['Confidence', 'Mindset', 'Focus'],
  hustler: ['Hustle', 'Discipline', 'Resilience'],
}

export const MINDSET_SOUNDSCAPE_MAP: Record<MindsetId, string> = {
  stoic: 'focus',
  existentialist: 'night',
  cynic: 'fire',
  hedonist: 'ocean',
  samurai: 'forest',
  scholar: 'night',
  manifestor: 'ocean',
  hustler: 'energy',
}

// --- #1: Smart Flow Transitions ---

export type PostGuideRecommendation = {
  type: 'soundscape'
  soundscapeId: string
} | {
  type: 'none'
}

/**
 * Recommend audio to auto-play after Daily Guide module completion.
 * Maps last completed module to a contextual soundscape.
 */
export function getPostGuideRecommendation(
  lastModule: string,
  mindsetId?: MindsetId | null,
): PostGuideRecommendation {
  const mindsetSoundscape = mindsetId ? MINDSET_SOUNDSCAPE_MAP[mindsetId] : 'focus'

  const MODULE_SOUNDSCAPE_MAP: Record<string, string> = {
    breath: 'relax',
    morning_prime: mindsetSoundscape,
    day_close: 'sleep',
    movement: 'energy',
    workout: 'energy',
    micro_lesson: 'focus',
    cosmic_insight: 'night',
  }

  const soundscapeId = MODULE_SOUNDSCAPE_MAP[lastModule]
  if (soundscapeId) {
    return { type: 'soundscape', soundscapeId }
  }
  return { type: 'none' }
}

// --- #2: Adaptive Home Feed ---

export type FeedSection = 'soundscapes' | 'guided' | 'motivation' | 'music' | 'wisdom'

interface FeedSignals {
  journalMood?: string | null     // awful, low, okay, good, great
  energyLevel?: string | null     // low, normal, high
  timeOfDay: Mode                 // focus, relax, sleep, energy
  streak: number
  lastPlayedType?: string | null  // music, motivation, soundscape
  mindsetId?: MindsetId | null
}

/**
 * Score and reorder home sections based on user signals.
 * Returns ordered array of section IDs.
 */
export function getAdaptiveSectionOrder(signals: FeedSignals): FeedSection[] {
  const scores: Record<FeedSection, number> = {
    soundscapes: 0,
    guided: 0,
    motivation: 0,
    music: 0,
    wisdom: 0,
  }

  // Time of day
  if (signals.timeOfDay === 'sleep') {
    scores.soundscapes += 3
    scores.music += 2
  } else if (signals.timeOfDay === 'energy') {
    scores.motivation += 3
    scores.music += 2
  } else if (signals.timeOfDay === 'relax') {
    scores.soundscapes += 2
    scores.music += 2
    scores.guided += 1
  } else {
    scores.motivation += 2
    scores.music += 1
  }

  // Mood
  if (signals.journalMood === 'awful' || signals.journalMood === 'low') {
    scores.guided += 3
    scores.soundscapes += 2
    scores.motivation += 1
  } else if (signals.journalMood === 'great' || signals.journalMood === 'good') {
    scores.motivation += 3
    scores.music += 2
  }

  // Energy
  if (signals.energyLevel === 'low') {
    scores.soundscapes += 2
    scores.guided += 1
    scores.motivation -= 1
  } else if (signals.energyLevel === 'high') {
    scores.motivation += 2
    scores.music += 1
  }

  // Wisdom — higher when reflective, streak milestones, morning
  if (signals.journalMood === 'awful' || signals.journalMood === 'low') {
    scores.wisdom += 3
  } else if (signals.journalMood === 'okay') {
    scores.wisdom += 2
  }
  if (signals.timeOfDay === 'focus' || signals.timeOfDay === 'relax') {
    scores.wisdom += 1
  }
  if (signals.streak > 0 && signals.streak % 7 === 0) {
    scores.wisdom += 2 // streak milestones
  }
  if (signals.energyLevel === 'high') {
    scores.wisdom -= 1 // prefer motivation/music when high energy
  }

  // Avoid repetition — deprioritize last played type
  if (signals.lastPlayedType === 'music') {
    scores.motivation += 1
    scores.soundscapes += 1
  } else if (signals.lastPlayedType === 'motivation') {
    scores.music += 1
    scores.soundscapes += 1
  } else if (signals.lastPlayedType === 'soundscape') {
    scores.motivation += 1
    scores.music += 1
  }

  return (Object.entries(scores) as [FeedSection, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([section]) => section)
}

// --- #8: Client-side Wellness Score ---

interface WellnessInputs {
  journalMood?: string | null        // today's mood
  recentMoods?: (string | null)[]    // last 3 days
  streak: number
  modulesCompletedToday: number      // count of true boolean flags
  hasJournaledToday: boolean
}

export interface WellnessBreakdown {
  score: number        // 0-100
  mood: number         // 0-25
  consistency: number  // 0-25
  engagement: number   // 0-25
  trend: number        // 0-25
}

const MOOD_SCORES: Record<string, number> = {
  great: 25, good: 20, okay: 15, low: 8, awful: 3,
}

export function calculateClientWellness(inputs: WellnessInputs): WellnessBreakdown {
  // Mood (0-25) — default to "okay" baseline when no mood logged
  const mood = MOOD_SCORES[inputs.journalMood || ''] ?? 15

  // Consistency (0-25) — even streak=1 gives a solid base
  const consistency = Math.min(25, 8 + Math.round((inputs.streak / 14) * 17))

  // Engagement (0-25) — give baseline credit for showing up
  const moduleScore = Math.min(15, inputs.modulesCompletedToday * 5)
  const journalScore = inputs.hasJournaledToday ? 5 : 0
  const engagement = Math.min(25, 5 + moduleScore + journalScore)

  // Trend (0-25) — compare today vs recent average
  let trend = 18 // optimistic default
  if (inputs.recentMoods && inputs.recentMoods.length >= 2) {
    const recentAvg = inputs.recentMoods
      .filter(Boolean)
      .map(m => MOOD_SCORES[m!] ?? 15)
      .reduce((a, b) => a + b, 0) / Math.max(1, inputs.recentMoods.filter(Boolean).length)
    const todayScore = MOOD_SCORES[inputs.journalMood || ''] ?? 15
    if (todayScore > recentAvg + 3) trend = 23
    else if (todayScore < recentAvg - 3) trend = 10
  }

  const score = mood + consistency + engagement + trend

  return { score, mood, consistency, engagement, trend }
}

export function getWellnessZone(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Thriving', color: 'text-emerald-400' }
  if (score >= 60) return { label: 'Good', color: 'text-green-400' }
  if (score >= 40) return { label: 'Building', color: 'text-cyan-400' }
  return { label: 'Starting', color: 'text-white/60' }
}
