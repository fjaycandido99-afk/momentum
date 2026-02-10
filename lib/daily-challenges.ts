export interface DailyChallenge {
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
  condition: ChallengeCondition
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

/** Get 3 deterministic daily challenges for a given date (YYYY-MM-DD) */
export function getDailyChallenges(dateStr: string): DailyChallenge[] {
  const rand = seededRandom(dateToSeed(dateStr))
  const pool = [...CHALLENGE_POOL]

  // Fisher-Yates shuffle with seeded random
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
