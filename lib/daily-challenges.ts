export interface DailyChallenge {
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
  condition: ChallengeCondition
  /** Present only on mindset-specific challenges */
  mindsetTag?: string
}

export type ChallengeCondition =
  | { type: 'journal_words'; minWords: number }
  | { type: 'modules_complete'; count: number }
  | { type: 'breathing_session' }
  | { type: 'mood_log' }
  | { type: 'all_modules' }
  | { type: 'soundscape_listen' }
  | { type: 'routine_complete' }
  | { type: 'coach_chat' }
  | { type: 'journal_entry' }
  | { type: 'xp_earned'; amount: number }
  | { type: 'morning_module' }
  | { type: 'evening_module' }
  | { type: 'gratitude_entry' }
  | { type: 'music_listen' }
  | { type: 'goal_progress' }

const CHALLENGE_POOL: DailyChallenge[] = [
  { id: 'write_200', title: 'Deep Reflection', description: 'Write 200+ words in your journal', icon: '✍️', xpReward: 30, condition: { type: 'journal_words', minWords: 200 } },
  { id: 'complete_3', title: 'Triple Threat', description: 'Complete 3 modules', icon: '🎯', xpReward: 25, condition: { type: 'modules_complete', count: 3 } },
  { id: 'breathe', title: 'Breathe Easy', description: 'Complete a breathing session', icon: '🌬️', xpReward: 15, condition: { type: 'breathing_session' } },
  { id: 'mood', title: 'Check In', description: 'Log your mood today', icon: '🧠', xpReward: 10, condition: { type: 'mood_log' } },
  { id: 'all_modules', title: 'Full Sweep', description: 'Complete all daily modules', icon: '🏆', xpReward: 50, condition: { type: 'all_modules' } },
  { id: 'soundscape', title: 'Sound Bath', description: 'Listen to a soundscape', icon: '🎧', xpReward: 15, condition: { type: 'soundscape_listen' } },
  { id: 'routine', title: 'Follow the Plan', description: 'Complete a routine', icon: '📋', xpReward: 20, condition: { type: 'routine_complete' } },
  { id: 'coach', title: 'Ask the Coach', description: 'Have a coaching session', icon: '💬', xpReward: 15, condition: { type: 'coach_chat' } },
  { id: 'journal', title: 'Express Yourself', description: 'Write a journal entry', icon: '📝', xpReward: 15, condition: { type: 'journal_entry' } },
  { id: 'earn_50', title: 'XP Hunter', description: 'Earn 50 XP today', icon: '⚡', xpReward: 20, condition: { type: 'xp_earned', amount: 50 } },
  { id: 'morning', title: 'Rise & Shine', description: 'Complete your morning module', icon: '🌅', xpReward: 15, condition: { type: 'morning_module' } },
  { id: 'evening', title: 'Wind Down', description: 'Complete your evening module', icon: '🌙', xpReward: 15, condition: { type: 'evening_module' } },
  { id: 'gratitude', title: 'Grateful Heart', description: 'Write in your gratitude journal', icon: '🙏', xpReward: 15, condition: { type: 'gratitude_entry' } },
  { id: 'music', title: 'Music Therapy', description: 'Listen to background music', icon: '🎵', xpReward: 10, condition: { type: 'music_listen' } },
  { id: 'goal', title: 'Goal Digger', description: 'Make progress on a goal', icon: '🎯', xpReward: 15, condition: { type: 'goal_progress' } },
]

import type { MindsetId } from '@/lib/mindset/types'

const MINDSET_CHALLENGE_POOL: Record<MindsetId, DailyChallenge[]> = {
  stoic: [
    { id: 'stoic_journal', title: 'Stoic Reflection', description: 'Write a journal entry examining what you can control', icon: '🏛️', xpReward: 25, condition: { type: 'journal_entry' }, mindsetTag: 'Stoic' },
    { id: 'stoic_breathe', title: 'Negative Visualization', description: 'Complete a breathing session to practice stillness', icon: '🏛️', xpReward: 20, condition: { type: 'breathing_session' }, mindsetTag: 'Stoic' },
    { id: 'stoic_mood', title: 'Emotional Audit', description: 'Log your mood and observe without judgment', icon: '🏛️', xpReward: 15, condition: { type: 'mood_log' }, mindsetTag: 'Stoic' },
    { id: 'stoic_morning', title: 'Morning Premeditatio', description: 'Complete your morning module to set intentions', icon: '🏛️', xpReward: 20, condition: { type: 'morning_module' }, mindsetTag: 'Stoic' },
    { id: 'stoic_gratitude', title: 'Virtuous Gratitude', description: 'Write in your gratitude journal', icon: '🏛️', xpReward: 15, condition: { type: 'gratitude_entry' }, mindsetTag: 'Stoic' },
  ],
  existentialist: [
    { id: 'exist_journal', title: 'Authentic Expression', description: 'Write 200+ words exploring your authentic self', icon: '🌀', xpReward: 30, condition: { type: 'journal_words', minWords: 200 }, mindsetTag: 'Existentialist' },
    { id: 'exist_coach', title: 'Confront the Absurd', description: 'Have a coaching session about meaning', icon: '🌀', xpReward: 20, condition: { type: 'coach_chat' }, mindsetTag: 'Existentialist' },
    { id: 'exist_mood', title: 'Freedom Check-In', description: 'Log your mood — own your emotional state', icon: '🌀', xpReward: 15, condition: { type: 'mood_log' }, mindsetTag: 'Existentialist' },
    { id: 'exist_evening', title: 'Evening Reckoning', description: 'Complete your evening reflection', icon: '🌀', xpReward: 20, condition: { type: 'evening_module' }, mindsetTag: 'Existentialist' },
    { id: 'exist_soundscape', title: 'Embrace the Void', description: 'Listen to a soundscape in solitude', icon: '🌀', xpReward: 15, condition: { type: 'soundscape_listen' }, mindsetTag: 'Existentialist' },
  ],
  cynic: [
    { id: 'cynic_journal', title: 'Radical Honesty', description: 'Write a raw, unfiltered journal entry', icon: '🔥', xpReward: 20, condition: { type: 'journal_entry' }, mindsetTag: 'Cynic' },
    { id: 'cynic_morning', title: 'Strip It Down', description: 'Start with the essentials — complete morning module', icon: '🔥', xpReward: 20, condition: { type: 'morning_module' }, mindsetTag: 'Cynic' },
    { id: 'cynic_xp', title: 'Prove It', description: 'Earn 50 XP through action, not words', icon: '🔥', xpReward: 25, condition: { type: 'xp_earned', amount: 50 }, mindsetTag: 'Cynic' },
    { id: 'cynic_routine', title: 'No Excuses', description: 'Complete a routine without skipping', icon: '🔥', xpReward: 20, condition: { type: 'routine_complete' }, mindsetTag: 'Cynic' },
    { id: 'cynic_breathe', title: 'Stripped Silence', description: 'Complete a breathing session — no distractions', icon: '🔥', xpReward: 15, condition: { type: 'breathing_session' }, mindsetTag: 'Cynic' },
  ],
  hedonist: [
    { id: 'hedo_music', title: 'Savor the Sound', description: 'Listen to background music mindfully', icon: '🌿', xpReward: 15, condition: { type: 'music_listen' }, mindsetTag: 'Hedonist' },
    { id: 'hedo_gratitude', title: 'Garden of Thanks', description: 'Write in your gratitude journal', icon: '🌿', xpReward: 15, condition: { type: 'gratitude_entry' }, mindsetTag: 'Hedonist' },
    { id: 'hedo_soundscape', title: 'Ataraxia Session', description: 'Find peace through a soundscape', icon: '🌿', xpReward: 15, condition: { type: 'soundscape_listen' }, mindsetTag: 'Hedonist' },
    { id: 'hedo_coach', title: 'Friendly Wisdom', description: 'Chat with your coach about what brings joy', icon: '🌿', xpReward: 20, condition: { type: 'coach_chat' }, mindsetTag: 'Hedonist' },
    { id: 'hedo_journal', title: 'Pleasure Inventory', description: 'Journal about what you truly enjoyed today', icon: '🌿', xpReward: 20, condition: { type: 'journal_entry' }, mindsetTag: 'Hedonist' },
  ],
  samurai: [
    { id: 'samurai_all', title: 'Full Sweep', description: 'Complete all daily modules like a true warrior', icon: '⚔️', xpReward: 50, condition: { type: 'all_modules' }, mindsetTag: 'Samurai' },
    { id: 'samurai_morning', title: 'Dawn Training', description: 'Complete your morning module at first light', icon: '⚔️', xpReward: 20, condition: { type: 'morning_module' }, mindsetTag: 'Samurai' },
    { id: 'samurai_3mod', title: 'Discipline Sprint', description: 'Complete 3 modules with focus', icon: '⚔️', xpReward: 25, condition: { type: 'modules_complete', count: 3 }, mindsetTag: 'Samurai' },
    { id: 'samurai_breathe', title: 'Zen Stillness', description: 'Complete a breathing session with presence', icon: '⚔️', xpReward: 20, condition: { type: 'breathing_session' }, mindsetTag: 'Samurai' },
    { id: 'samurai_goal', title: 'Advance the Mission', description: 'Make progress on a goal', icon: '⚔️', xpReward: 15, condition: { type: 'goal_progress' }, mindsetTag: 'Samurai' },
  ],
  scholar: [
    { id: 'scholar_journal', title: 'Deep Inquiry', description: 'Write 200+ words exploring an inner pattern', icon: '🔮', xpReward: 30, condition: { type: 'journal_words', minWords: 200 }, mindsetTag: 'Scholar' },
    { id: 'scholar_mood', title: 'Pattern Recognition', description: 'Log your mood to track emotional patterns', icon: '🔮', xpReward: 15, condition: { type: 'mood_log' }, mindsetTag: 'Scholar' },
    { id: 'scholar_coach', title: 'Oracle Session', description: 'Consult the coach for deeper insight', icon: '🔮', xpReward: 20, condition: { type: 'coach_chat' }, mindsetTag: 'Scholar' },
    { id: 'scholar_soundscape', title: 'Astral Listening', description: 'Listen to a soundscape for cosmic perspective', icon: '🔮', xpReward: 15, condition: { type: 'soundscape_listen' }, mindsetTag: 'Scholar' },
    { id: 'scholar_evening', title: 'Evening Integration', description: 'Complete your evening module to integrate the day', icon: '🔮', xpReward: 20, condition: { type: 'evening_module' }, mindsetTag: 'Scholar' },
  ],
}

/** Seeded PRNG for deterministic daily selection */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function dateToSeed(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** Get 3 deterministic daily challenges for a given date (YYYY-MM-DD).
 *  When mindsetId is provided: 1 mindset-specific + 2 generic.
 *  Without mindsetId: 3 generic (same as before). */
export function getDailyChallenges(dateStr: string, mindsetId?: MindsetId | null): DailyChallenge[] {
  const seed = dateToSeed(dateStr)
  const rand = seededRandom(seed)

  if (mindsetId && MINDSET_CHALLENGE_POOL[mindsetId]) {
    // Pick 1 mindset challenge
    const mindsetPool = [...MINDSET_CHALLENGE_POOL[mindsetId]]
    for (let i = mindsetPool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [mindsetPool[i], mindsetPool[j]] = [mindsetPool[j], mindsetPool[i]]
    }
    const mindsetChallenge = mindsetPool[0]

    // Pick 2 generic challenges
    const genericPool = [...CHALLENGE_POOL]
    for (let i = genericPool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [genericPool[i], genericPool[j]] = [genericPool[j], genericPool[i]]
    }

    return [mindsetChallenge, ...genericPool.slice(0, 2)]
  }

  // Fallback: 3 generic
  const pool = [...CHALLENGE_POOL]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 3)
}

/** Check if a challenge condition is met based on today's data */
export function checkChallengeCondition(
  condition: ChallengeCondition,
  dailyGuide: {
    morning_prime_done?: boolean
    movement_done?: boolean
    micro_lesson_done?: boolean
    breath_done?: boolean
    day_close_done?: boolean
    journal_freetext?: string | null
    journal_gratitude?: string | null
    journal_win?: string | null
    mood_before?: string | null
    mood_after?: string | null
    music_genre_used?: string | null
  } | null,
  todaysXP: number,
  xpEvents: { event_type: string }[]
): boolean {
  if (!dailyGuide && condition.type !== 'xp_earned') return false

  const g = dailyGuide
  const allModulesDone = g ? (g.morning_prime_done && g.movement_done && g.micro_lesson_done && g.breath_done && g.day_close_done) : false
  const modulesDoneCount = g ? [g.morning_prime_done, g.movement_done, g.micro_lesson_done, g.breath_done, g.day_close_done].filter(Boolean).length : 0
  const hasJournal = !!(g?.journal_freetext || g?.journal_win || g?.journal_gratitude)
  const journalWords = [g?.journal_freetext, g?.journal_win, g?.journal_gratitude].filter(Boolean).join(' ').split(/\s+/).filter(Boolean).length

  switch (condition.type) {
    case 'journal_words': return journalWords >= condition.minWords
    case 'modules_complete': return modulesDoneCount >= condition.count
    case 'breathing_session': return !!g?.breath_done
    case 'mood_log': return !!(g?.mood_before || g?.mood_after)
    case 'all_modules': return !!allModulesDone
    case 'soundscape_listen': return xpEvents.some(e => e.event_type === 'focusSession')
    case 'routine_complete': return xpEvents.some(e => e.event_type === 'routineComplete')
    case 'coach_chat': return xpEvents.some(e => e.event_type === 'coachChat' || e.event_type === 'accountabilityCheckIn')
    case 'journal_entry': return hasJournal
    case 'xp_earned': return todaysXP >= condition.amount
    case 'morning_module': return !!g?.morning_prime_done
    case 'evening_module': return !!g?.day_close_done
    case 'gratitude_entry': return !!g?.journal_gratitude
    case 'music_listen': return !!g?.music_genre_used
    case 'goal_progress': return xpEvents.some(e => e.event_type === 'moduleComplete')
    default: return false
  }
}
