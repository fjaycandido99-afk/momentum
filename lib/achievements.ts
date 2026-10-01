export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type AchievementCategory = 'era' | 'consistency' | 'explorer' | 'dedication' | 'mastery' | 'growth' | 'secret'

/**
 * What an era achievement counts. Evaluated from Era/EraPromise rows on the
 * server (lib/achievements-server.ts) — never from anything the client sends.
 */
export type EraMetric =
  | 'promises_made'
  | 'promises_kept'
  | 'promise_streak'
  | 'eras_started'
  | 'eras_completed'
  | 'perfect_eras'
  | 'custom_eras'
  | 'comebacks'
  /** Finished eras they carried a discipline forward from. */
  | 'carried_forward'
  /** Eras they wrote their one line for. */
  | 'eras_reflected'
  /** A new era started after a week or more with none — a rest, then back. */
  | 'era_returns'

export interface EraAchievementStats {
  promisesMade: number
  promisesKept: number
  /** Longest run of consecutive days with a promise made, in any era. */
  longestPromiseStreak: number
  erasStarted: number
  erasCompleted: number
  /** Finished eras where every answered promise was kept (20+ answered). */
  perfectEras: number
  customEras: number
  /** A promise kept the day after one that wasn't. */
  comebacks: number
  carriedForward: number
  erasReflected: number
  eraReturns: number
  /** Which eras they have finished, by key (one entry per finish). */
  completedKeys: string[]
}

/**
 * What the record itself counts: days of proof, and Right now sessions.
 * From rows on the server, like the era and practice metrics.
 */
export type RecordMetric =
  /** Days with something kept — a promise, a discipline, a session. Proof's own unit. */
  | 'proof_days'
  /** Right now sessions finished. */
  | 'resets_done'
  /** Sessions they rated themselves lower after than before — their own numbers. */
  | 'resets_helped'

export interface RecordAchievementStats {
  proofDays: number
  resetsDone: number
  resetsHelped: number
}

/**
 * What a practice achievement counts.
 *
 * The two features closest to the point of the app — the disciplines someone
 * keeps and the exercises Voxu runs with them — earned nothing for months.
 * Fifty-five achievements, and none of them could be reached by showing up.
 *
 * Counted from Practice/PracticeLog/ExerciseRun on the server, never from
 * anything the client sends, exactly like the era metrics above.
 */
export type PracticeMetric =
  | 'practices_kept'
  /** Days kept on the minimum. The behaviour the whole feature exists for. */
  | 'minimum_days'
  /** Longest run of consecutive DUE days kept, for any one discipline. */
  | 'practice_run'
  | 'disciplines_kept'
  /** Kept the next due day after one that was missed. */
  | 'practice_comebacks'
  | 'exercises_done'
  | 'exercise_days'
  | 'exercise_variety'
  /**
   * Books finished.
   *
   * The only book number worth an achievement. Not pages read, not a
   * reading pace, not books per month — those are all speed, and rewarding
   * speed in reading rewards the wrong thing. Getting to the end of one.
   */
  | 'books_finished'

export interface PracticeAchievementStats {
  practicesKept: number
  minimumDays: number
  longestPracticeRun: number
  /** Disciplines with at least one kept day — not merely created. */
  disciplinesKept: number
  practiceComebacks: number
  exercisesDone: number
  exerciseDays: number
  exerciseVariety: number
  booksFinished: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  rarity: AchievementRarity
  xpReward: number
  condition: AchievementCondition
  /**
   * Retired: the feature it counted no longer exists, so nobody new can earn
   * it.
   *
   * NOT deleted. Six of these are held by a real account — the path and
   * virtue features were live until February 2026 — and removing the
   * definition would erase badges somebody actually earned. Retired ones are
   * hidden from the list, the denominator and the "next up" queue for anyone
   * who does not already hold them, and still render for anyone who does.
   */
  retired?: boolean
}

export type AchievementCondition =
  | { type: 'streak'; days: number }
  | { type: 'first_action'; action: string }
  | { type: 'count'; action: string; count: number }
  | { type: 'xp_total'; amount: number }
  | { type: 'level'; level: number }
  | { type: 'time_range'; start: number; end: number; action: string }
  | { type: 'consecutive_days'; days: number; action: string }
  | { type: 'era'; metric: EraMetric; count: number }
  | { type: 'practice'; metric: PracticeMetric; count: number }
  | { type: 'record'; metric: RecordMetric; count: number }
  /** Finished an era of this kind — one coin per era, a set to collect. */
  | { type: 'era_finished'; eraKey: string }

// Rarity is monochrome, like the rest of Voxu: it reads as how much light a
// badge gives off — a faint ring, a clear one, a bright one, one that glows —
// never as a colour. (It was blue/purple/amber, the only colour in the app.)
export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: 'border-white/15',
  rare: 'border-white/35',
  epic: 'border-white/60',
  legendary: 'border-white',
}

export const RARITY_BG: Record<AchievementRarity, string> = {
  common: 'bg-white/[0.03]',
  rare: 'bg-white/[0.05]',
  epic: 'bg-white/[0.07]',
  legendary: 'bg-white/[0.10]',
}

export const RARITY_TEXT: Record<AchievementRarity, string> = {
  common: 'text-white/55',
  rare: 'text-white/75',
  epic: 'text-white/90',
  legendary: 'text-white',
}

export const RARITY_GLOW: Record<AchievementRarity, string> = {
  common: '',
  rare: 'shadow-[0_0_10px_rgba(255,255,255,0.06)]',
  epic: 'shadow-[0_0_14px_rgba(255,255,255,0.12)]',
  legendary: 'shadow-[0_0_22px_rgba(255,255,255,0.28)]',
}

// Era first: it's the core loop, so its achievements lead the grid.
export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  era: 'Era',
  consistency: 'Consistency',
  explorer: 'Explorer',
  dedication: 'Dedication',
  mastery: 'Mastery',
  growth: 'Growth',
  secret: 'Secret',
}

export const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  era: '🜂',
  consistency: '🔥',
  explorer: '🧭',
  dedication: '💎',
  mastery: '⚡',
  growth: '🌱',
  secret: '🔮',
}

/**
 * Badge art per category, served from /public (e.g. '/achievements/era.jpg').
 * Unset until the file is committed — tiles fall back to the monochrome
 * emoji. The achievements test fails if a path points at a missing file.
 */
export const CATEGORY_BADGE_IMAGES: Partial<Record<AchievementCategory, string>> = {
  era: '/achievements/era.jpg',
  consistency: '/achievements/consistency.jpg',
  explorer: '/achievements/explorer.jpg',
  dedication: '/achievements/dedication.jpg',
  mastery: '/achievements/mastery.jpg',
  growth: '/achievements/growth.jpg',
  secret: '/achievements/secret.jpg',
}

/**
 * Art for ONE badge, by achievement id — wins over its category's art.
 *
 * With one picture per category, every Era badge was the same coin with a
 * different number stamped on it, which is most of why the grid read as
 * samey. Add a file under /public/achievements/ and its path here; a badge
 * with no entry keeps its category's art. The achievements test fails if a
 * path points at a missing file, so nothing ships pointing at nothing.
 */
export const ACHIEVEMENT_BADGE_IMAGES: Partial<Record<string, string>> = {
  // Each era's coin wears that era's own art (Marcus Aurelius for Stoic,
  // the barbell for Gym Arc…) until a struck coin is made for it — see
  // docs/achievement-art-prompts.md. Swap the path; nothing else changes.
  era_done_locked_in: '/era/locked_in.jpg',
  era_done_discipline: '/era/discipline.jpg',
  era_done_comeback: '/era/comeback.jpg',
  era_done_gym_arc: '/era/gym_arc.jpg',
  era_done_stoic_mode: '/era/stoic_mode.jpg',
  era_done_confidence: '/era/confidence.jpg',
  era_done_study: '/era/study.jpg',
  era_done_five_am: '/era/five_am.jpg',
  era_done_custom: '/era/custom.jpg',
}

/** The art a badge shows: its own, else its category's, else none (emoji). */
export function badgeImage(id: string | undefined, category: AchievementCategory): string | undefined {
  return (id && ACHIEVEMENT_BADGE_IMAGES[id]) || CATEGORY_BADGE_IMAGES[category]
}

export const ACHIEVEMENTS: Achievement[] = [
  // --- Era (10) — the promise loop ---
  { id: 'era_first_promise', title: 'Said Out Loud', description: 'Make your first promise', icon: '🗣️', category: 'era', rarity: 'common', xpReward: 20, condition: { type: 'era', metric: 'promises_made', count: 1 } },
  { id: 'era_first_kept', title: 'Word Kept', description: 'Keep your first promise', icon: '✅', category: 'era', rarity: 'common', xpReward: 25, condition: { type: 'era', metric: 'promises_kept', count: 1 } },
  { id: 'era_custom', title: 'Author', description: 'Start an era you named yourself', icon: '✍️', category: 'era', rarity: 'common', xpReward: 20, condition: { type: 'era', metric: 'custom_eras', count: 1 } },
  { id: 'era_comeback', title: 'The Answer', description: 'Keep a promise the day after one you didn\'t', icon: '↩️', category: 'era', rarity: 'rare', xpReward: 60, condition: { type: 'era', metric: 'comebacks', count: 1 } },
  { id: 'era_kept_7', title: 'Seven Kept', description: 'Keep 7 promises', icon: '7️⃣', category: 'era', rarity: 'rare', xpReward: 75, condition: { type: 'era', metric: 'promises_kept', count: 7 } },
  { id: 'era_streak_7', title: 'Unbroken Week', description: 'Make a promise 7 days in a row', icon: '⛓️', category: 'era', rarity: 'rare', xpReward: 75, condition: { type: 'era', metric: 'promise_streak', count: 7 } },
  { id: 'era_kept_25', title: 'Person of Your Word', description: 'Keep 25 promises', icon: '🤝', category: 'era', rarity: 'epic', xpReward: 250, condition: { type: 'era', metric: 'promises_kept', count: 25 } },
  { id: 'era_complete', title: 'Era Complete', description: 'Finish a 30-day era', icon: '🏛️', category: 'era', rarity: 'epic', xpReward: 300, condition: { type: 'era', metric: 'eras_completed', count: 1 } },
  { id: 'era_three', title: 'Three Eras', description: 'Finish three eras', icon: '🗿', category: 'era', rarity: 'legendary', xpReward: 800, condition: { type: 'era', metric: 'eras_completed', count: 3 } },
  // The end of an era, and what comes after it.
  { id: 'era_second', title: 'Second Chapter', description: 'Finish a second era', icon: '📗', category: 'era', rarity: 'rare', xpReward: 150, condition: { type: 'era', metric: 'eras_completed', count: 2 } },
  { id: 'era_reflection', title: 'In Your Own Words', description: 'Write the line you\'ll remember an era by', icon: '🖋️', category: 'era', rarity: 'common', xpReward: 25, condition: { type: 'era', metric: 'eras_reflected', count: 1 } },
  { id: 'era_carried', title: 'What Stayed', description: 'Carry a discipline forward from a finished era', icon: '🪴', category: 'era', rarity: 'rare', xpReward: 100, condition: { type: 'era', metric: 'carried_forward', count: 1 } },
  { id: 'era_carried_3', title: 'Built to Last', description: 'Carry something forward from three different eras', icon: '🏗️', category: 'era', rarity: 'epic', xpReward: 400, condition: { type: 'era', metric: 'carried_forward', count: 3 } },
  { id: 'era_return', title: 'Came Back to It', description: 'Start a new era after a week or more away', icon: '🌄', category: 'era', rarity: 'rare', xpReward: 75, condition: { type: 'era', metric: 'era_returns', count: 1 } },
  { id: 'era_comeback_5', title: 'Always Comes Back', description: 'Keep a promise the day after a miss, five times', icon: '🔁', category: 'era', rarity: 'epic', xpReward: 250, condition: { type: 'era', metric: 'comebacks', count: 5 } },
  { id: 'era_streak_30', title: 'Thirty Unbroken', description: 'Make a promise 30 days in a row', icon: '🔗', category: 'era', rarity: 'epic', xpReward: 350, condition: { type: 'era', metric: 'promise_streak', count: 30 } },
  { id: 'era_kept_50', title: 'Fifty Kept', description: 'Keep 50 promises', icon: '🫱', category: 'era', rarity: 'epic', xpReward: 400, condition: { type: 'era', metric: 'promises_kept', count: 50 } },
  { id: 'era_kept_100', title: 'A Hundred Kept', description: 'Keep 100 promises', icon: '🗝️', category: 'era', rarity: 'legendary', xpReward: 1000, condition: { type: 'era', metric: 'promises_kept', count: 100 } },
  { id: 'era_five', title: 'Five Chapters', description: 'Finish five eras', icon: '📚', category: 'era', rarity: 'legendary', xpReward: 1200, condition: { type: 'era', metric: 'eras_completed', count: 5 } },
  // One coin per era: finishing a Gym Arc and finishing a Stoic Mode are
  // different months, and each deserves its own mark.
  { id: 'era_done_locked_in', title: 'Locked In Finished', description: 'Finish a Locked In era', icon: '🔒', category: 'era', rarity: 'epic', xpReward: 150, condition: { type: 'era_finished', eraKey: 'locked_in' } },
  { id: 'era_done_discipline', title: 'Discipline Era Finished', description: 'Finish a Discipline Era', icon: '🥾', category: 'era', rarity: 'epic', xpReward: 150, condition: { type: 'era_finished', eraKey: 'discipline' } },
  { id: 'era_done_comeback', title: 'Comeback Season Finished', description: 'Finish a Comeback Season', icon: '🛣️', category: 'era', rarity: 'epic', xpReward: 150, condition: { type: 'era_finished', eraKey: 'comeback' } },
  { id: 'era_done_gym_arc', title: 'Gym Arc Finished', description: 'Finish a Gym Arc', icon: '🏋️', category: 'era', rarity: 'epic', xpReward: 150, condition: { type: 'era_finished', eraKey: 'gym_arc' } },
  { id: 'era_done_stoic_mode', title: 'Stoic Mode Finished', description: 'Finish a Stoic Mode', icon: '🏛️', category: 'era', rarity: 'epic', xpReward: 150, condition: { type: 'era_finished', eraKey: 'stoic_mode' } },
  { id: 'era_done_confidence', title: 'Confidence Mode Finished', description: 'Finish a Confidence Mode', icon: '🦁', category: 'era', rarity: 'epic', xpReward: 150, condition: { type: 'era_finished', eraKey: 'confidence' } },
  { id: 'era_done_study', title: 'Study Era Finished', description: 'Finish a Study Era', icon: '🕯️', category: 'era', rarity: 'epic', xpReward: 150, condition: { type: 'era_finished', eraKey: 'study' } },
  { id: 'era_done_five_am', title: '5AM Era Finished', description: 'Finish a 5AM Era', icon: '🌅', category: 'era', rarity: 'epic', xpReward: 150, condition: { type: 'era_finished', eraKey: 'five_am' } },
  { id: 'era_done_custom', title: 'Your Own Era Finished', description: 'Finish an era you named yourself', icon: '🪶', category: 'era', rarity: 'epic', xpReward: 150, condition: { type: 'era_finished', eraKey: 'custom' } },
  { id: 'era_flawless', title: 'Flawless Era', description: 'Finish an era keeping every promise you checked in on (20+)', icon: '💠', category: 'era', rarity: 'legendary', xpReward: 1000, condition: { type: 'era', metric: 'perfect_eras', count: 1 } },

  // --- Practice (7) — the disciplines someone keeps ---
  // "The Floor" is the one that matters. Doing the minimum on a day you
  // didn't want to is the exact behaviour the whole feature exists to
  // produce, and it was the only thing in the app that earned nothing.
  { id: 'practice_first_kept', title: 'Kept It', description: 'Keep a discipline for the first time', icon: '🪨', category: 'consistency', rarity: 'common', xpReward: 25, condition: { type: 'practice', metric: 'practices_kept', count: 1 } },
  { id: 'practice_floor', title: 'The Floor', description: 'Do the minimum on a day you didn\'t want to', icon: '🧱', category: 'consistency', rarity: 'rare', xpReward: 60, condition: { type: 'practice', metric: 'minimum_days', count: 1 } },
  { id: 'practice_kept_10', title: 'Ten Days In', description: 'Keep a discipline 10 times', icon: '🔟', category: 'consistency', rarity: 'common', xpReward: 50, condition: { type: 'practice', metric: 'practices_kept', count: 10 } },
  { id: 'practice_back_on', title: 'Back On It', description: 'Keep a discipline the next day it was due, after missing one', icon: '↩️', category: 'consistency', rarity: 'rare', xpReward: 60, condition: { type: 'practice', metric: 'practice_comebacks', count: 1 } },
  { id: 'practice_run_14', title: 'Fourteen Straight', description: 'Keep one discipline every day it was due, 14 times running', icon: '⛓️', category: 'consistency', rarity: 'epic', xpReward: 250, condition: { type: 'practice', metric: 'practice_run', count: 14 } },
  { id: 'practice_three', title: 'Three Disciplines', description: 'Keep three different disciplines', icon: '🏗️', category: 'consistency', rarity: 'rare', xpReward: 80, condition: { type: 'practice', metric: 'disciplines_kept', count: 3 } },
  { id: 'practice_run_7', title: 'A Week Straight', description: 'Keep one discipline every day it was due, 7 times running', icon: '📆', category: 'consistency', rarity: 'common', xpReward: 50, condition: { type: 'practice', metric: 'practice_run', count: 7 } },
  { id: 'practice_kept_30', title: 'Thirty Kept', description: 'Keep a discipline 30 times', icon: '🪵', category: 'consistency', rarity: 'rare', xpReward: 150, condition: { type: 'practice', metric: 'practices_kept', count: 30 } },
  { id: 'practice_floor_10', title: 'Holds the Floor', description: 'Do the minimum on 10 days you didn\'t want to', icon: '🧱', category: 'consistency', rarity: 'epic', xpReward: 300, condition: { type: 'practice', metric: 'minimum_days', count: 10 } },
  { id: 'practice_back_5', title: 'Back Every Time', description: 'Get back on a discipline after a miss, five times', icon: '🔂', category: 'consistency', rarity: 'epic', xpReward: 250, condition: { type: 'practice', metric: 'practice_comebacks', count: 5 } },
  { id: 'practice_run_30', title: 'Thirty Straight', description: 'Keep one discipline every day it was due, 30 times running', icon: '🏔️', category: 'consistency', rarity: 'legendary', xpReward: 1000, condition: { type: 'practice', metric: 'practice_run', count: 30 } },
  { id: 'practice_kept_100', title: 'A Hundred Days', description: 'Keep a discipline 100 times', icon: '🗿', category: 'consistency', rarity: 'legendary', xpReward: 900, condition: { type: 'practice', metric: 'practices_kept', count: 100 } },

  // --- Exercises (4) — the ones Voxu runs with you ---
  { id: 'exercise_first', title: 'Sat With It', description: 'Finish your first mindset exercise', icon: '🧘', category: 'growth', rarity: 'common', xpReward: 25, condition: { type: 'practice', metric: 'exercises_done', count: 1 } },
  { id: 'exercise_10', title: 'Ten Sessions', description: 'Finish 10 mindset exercises', icon: '🌱', category: 'growth', rarity: 'rare', xpReward: 80, condition: { type: 'practice', metric: 'exercises_done', count: 10 } },
  { id: 'exercise_variety_5', title: 'Range', description: 'Finish 5 different mindset exercises', icon: '🎚️', category: 'growth', rarity: 'rare', xpReward: 80, condition: { type: 'practice', metric: 'exercise_variety', count: 5 } },
  { id: 'exercise_50', title: 'Fifty Sessions', description: 'Finish 50 mindset exercises', icon: '🌲', category: 'growth', rarity: 'epic', xpReward: 300, condition: { type: 'practice', metric: 'exercises_done', count: 50 } },
  { id: 'exercise_days_30', title: 'Thirty Days of It', description: 'Do a mindset exercise on 30 separate days', icon: '🌳', category: 'growth', rarity: 'epic', xpReward: 300, condition: { type: 'practice', metric: 'exercise_days', count: 30 } },

  // --- Books (3) ---
  // Finishing, never speed. Rewarding pages-per-day would push people to
  // read faster, which is the opposite of the point — and the reading sheet
  // already says ten pages you remember beats fifty you skimmed.
  { id: 'book_first', title: 'Finished It', description: 'Get to the end of a book', icon: '📖', category: 'growth', rarity: 'common', xpReward: 50, condition: { type: 'practice', metric: 'books_finished', count: 1 } },
  { id: 'book_5', title: 'Five Books', description: 'Finish five books', icon: '📚', category: 'growth', rarity: 'rare', xpReward: 150, condition: { type: 'practice', metric: 'books_finished', count: 5 } },
  { id: 'book_12', title: 'A Book a Month', description: 'Finish twelve books', icon: '🏛️', category: 'growth', rarity: 'epic', xpReward: 400, condition: { type: 'practice', metric: 'books_finished', count: 12 } },

  // --- Right now (3) — coming down when it's needed ---
  // "It Helped" is their own before/after numbers, never the app's judgement.
  { id: 'reset_first', title: 'Came Down', description: 'Finish a Right now session', icon: '🌊', category: 'growth', rarity: 'common', xpReward: 25, condition: { type: 'record', metric: 'resets_done', count: 1 } },
  { id: 'reset_helped', title: 'It Helped', description: 'Rate yourself calmer after a Right now session than before', icon: '🍃', category: 'growth', rarity: 'rare', xpReward: 60, condition: { type: 'record', metric: 'resets_helped', count: 1 } },
  { id: 'reset_10', title: 'Steady Hands', description: 'Finish 10 Right now sessions', icon: '🫗', category: 'growth', rarity: 'rare', xpReward: 120, condition: { type: 'record', metric: 'resets_done', count: 10 } },

  // --- Proof (4) — days with something kept, Proof's own unit ---
  { id: 'proof_7', title: 'A Week of Proof', description: 'Keep something on 7 different days', icon: '🧾', category: 'dedication', rarity: 'common', xpReward: 40, condition: { type: 'record', metric: 'proof_days', count: 7 } },
  { id: 'proof_30', title: 'Thirty Days of Proof', description: 'Keep something on 30 different days', icon: '🗓️', category: 'dedication', rarity: 'rare', xpReward: 200, condition: { type: 'record', metric: 'proof_days', count: 30 } },
  { id: 'proof_100', title: 'A Hundred Days of Proof', description: 'Keep something on 100 different days', icon: '📜', category: 'dedication', rarity: 'epic', xpReward: 600, condition: { type: 'record', metric: 'proof_days', count: 100 } },
  { id: 'proof_365', title: 'A Year of Proof', description: 'Keep something on 365 different days', icon: '🏺', category: 'dedication', rarity: 'legendary', xpReward: 2000, condition: { type: 'record', metric: 'proof_days', count: 365 } },

  // --- Consistency (7) ---
  { id: 'streak_3', title: 'Getting Started', description: 'Reach a 3-day streak', icon: '🔥', category: 'consistency', rarity: 'common', xpReward: 25, condition: { type: 'streak', days: 3 } },
  { id: 'streak_7', title: 'Week Warrior', description: 'Reach a 7-day streak', icon: '🔥', category: 'consistency', rarity: 'common', xpReward: 50, condition: { type: 'streak', days: 7 } },
  { id: 'streak_14', title: 'Two Week Titan', description: 'Reach a 14-day streak', icon: '💪', category: 'consistency', rarity: 'rare', xpReward: 100, condition: { type: 'streak', days: 14 } },
  { id: 'streak_30', title: 'Monthly Master', description: 'Reach a 30-day streak', icon: '🏆', category: 'consistency', rarity: 'rare', xpReward: 200, condition: { type: 'streak', days: 30 } },
  { id: 'streak_60', title: 'Unstoppable', description: 'Reach a 60-day streak', icon: '⚡', category: 'consistency', rarity: 'epic', xpReward: 400, condition: { type: 'streak', days: 60 } },
  { id: 'streak_100', title: 'Century Club', description: 'Reach a 100-day streak', icon: '💯', category: 'consistency', rarity: 'epic', xpReward: 600, condition: { type: 'streak', days: 100 } },
  { id: 'streak_365', title: 'Year of Growth', description: 'Reach a 365-day streak', icon: '👑', category: 'consistency', rarity: 'legendary', xpReward: 1000, condition: { type: 'streak', days: 365 } },

  // --- Explorer (5) ---
  { id: 'first_journal', title: 'Dear Diary', description: 'Write your first journal entry', icon: '📝', category: 'explorer', rarity: 'common', xpReward: 20, condition: { type: 'first_action', action: 'journal' } },
  { id: 'first_soundscape', title: 'Sound Explorer', description: 'Listen to your first soundscape', icon: '🎧', category: 'explorer', rarity: 'common', xpReward: 20, condition: { type: 'first_action', action: 'soundscape' } },
  { retired: true, id: 'first_routine', title: 'Routine Builder', description: 'Create your first routine', icon: '📋', category: 'explorer', rarity: 'common', xpReward: 20, condition: { type: 'first_action', action: 'routine' } },
  { id: 'genre_explorer', title: 'Genre Explorer', description: 'Listen to 5 different music genres', icon: '🎵', category: 'explorer', rarity: 'rare', xpReward: 75, condition: { type: 'count', action: 'unique_genres', count: 5 } },
  { id: 'all_modules', title: 'Full Experience', description: 'Complete all session types at least once', icon: '🌟', category: 'explorer', rarity: 'rare', xpReward: 100, condition: { type: 'count', action: 'unique_modules', count: 4 } },

  // --- Dedication (5) ---
  { id: 'early_bird', title: 'Early Bird', description: 'Complete a module before 7 AM', icon: '🌅', category: 'dedication', rarity: 'common', xpReward: 30, condition: { type: 'time_range', start: 4, end: 7, action: 'moduleComplete' } },
  { id: 'night_owl', title: 'Night Owl', description: 'Complete a module after 10 PM', icon: '🦉', category: 'dedication', rarity: 'common', xpReward: 30, condition: { type: 'time_range', start: 22, end: 4, action: 'moduleComplete' } },
  { id: 'full_day_5x', title: 'All-In', description: 'Complete all daily modules 5 times', icon: '🎯', category: 'dedication', rarity: 'rare', xpReward: 150, condition: { type: 'count', action: 'full_day_complete', count: 5 } },
  { id: 'weekend_warrior', title: 'Weekend Warrior', description: 'Complete modules on 4 weekends', icon: '🏋️', category: 'dedication', rarity: 'rare', xpReward: 100, condition: { type: 'count', action: 'weekend_active', count: 4 } },
  { id: 'modules_50', title: 'Module Machine', description: 'Complete 50 modules', icon: '⚙️', category: 'dedication', rarity: 'epic', xpReward: 300, condition: { type: 'count', action: 'moduleComplete', count: 50 } },

  // --- Mastery (4) ---
  { id: 'xp_500', title: 'Rising Star', description: 'Earn 500 total XP', icon: '⭐', category: 'mastery', rarity: 'common', xpReward: 50, condition: { type: 'xp_total', amount: 500 } },
  { id: 'xp_2000', title: 'XP Collector', description: 'Earn 2,000 total XP', icon: '💫', category: 'mastery', rarity: 'rare', xpReward: 100, condition: { type: 'xp_total', amount: 2000 } },
  { id: 'xp_5000', title: 'XP Legend', description: 'Earn 5,000 total XP', icon: '🌠', category: 'mastery', rarity: 'epic', xpReward: 250, condition: { type: 'xp_total', amount: 5000 } },
  { id: 'level_5', title: 'Warrior Status', description: 'Reach Level 5', icon: '🗡️', category: 'mastery', rarity: 'rare', xpReward: 150, condition: { type: 'level', level: 5 } },

  // --- Growth (5) ---
  { id: 'journal_7', title: 'Journaling Habit', description: 'Write 7 journal entries', icon: '📖', category: 'growth', rarity: 'common', xpReward: 50, condition: { type: 'count', action: 'journal', count: 7 } },
  { id: 'journal_30', title: 'Journaling Pro', description: 'Write 30 journal entries', icon: '📚', category: 'growth', rarity: 'rare', xpReward: 150, condition: { type: 'count', action: 'journal', count: 30 } },
  { id: 'mood_tracker', title: 'Self-Aware', description: 'Log your mood 10 times', icon: '🧠', category: 'growth', rarity: 'common', xpReward: 40, condition: { type: 'count', action: 'mood_log', count: 10 } },
  { id: 'breathing_10', title: 'Breathe Deep', description: 'Complete 10 breathing sessions', icon: '🌬️', category: 'growth', rarity: 'rare', xpReward: 75, condition: { type: 'count', action: 'breathingSession', count: 10 } },
  { id: 'goal_complete', title: 'Goal Getter', description: 'Complete your first goal', icon: '🎯', category: 'growth', rarity: 'common', xpReward: 50, condition: { type: 'first_action', action: 'goal_complete' } },

  // --- Path (6) ---
  { retired: true, id: 'path_first', title: 'Path Finder', description: 'Complete your first path day (4/4)', icon: '🧭', category: 'explorer', rarity: 'common', xpReward: 30, condition: { type: 'first_action', action: 'path_complete' } },
  { retired: true, id: 'path_7', title: 'Path Walker', description: 'Complete 7 full path days', icon: '🛤️', category: 'consistency', rarity: 'rare', xpReward: 100, condition: { type: 'count', action: 'path_complete', count: 7 } },
  { retired: true, id: 'path_21', title: 'Path Master', description: 'Complete 21 full path days', icon: '🏔️', category: 'consistency', rarity: 'epic', xpReward: 250, condition: { type: 'count', action: 'path_complete', count: 21 } },
  { retired: true, id: 'path_streak_7', title: 'Devoted Seeker', description: 'Reach a 7-day path streak', icon: '🔗', category: 'consistency', rarity: 'rare', xpReward: 75, condition: { type: 'consecutive_days', days: 7, action: 'path_activity' } },
  { retired: true, id: 'path_streak_30', title: 'Unwavering', description: 'Reach a 30-day path streak', icon: '⛓️', category: 'consistency', rarity: 'epic', xpReward: 300, condition: { type: 'consecutive_days', days: 30, action: 'path_activity' } },
  { retired: true, id: 'virtue_tracker', title: 'Virtue Seeker', description: 'Track a virtue for 7 days', icon: '🌿', category: 'growth', rarity: 'rare', xpReward: 75, condition: { type: 'consecutive_days', days: 7, action: 'virtue_track' } },

  // --- Secret (2) ---
  { id: 'midnight_owl', title: 'Midnight Owl', description: 'Use the app at exactly midnight', icon: '🌑', category: 'secret', rarity: 'epic', xpReward: 100, condition: { type: 'time_range', start: 0, end: 1, action: 'any' } },
  { id: 'perfect_week', title: 'Perfect Week', description: 'Complete all modules every day for a week', icon: '✨', category: 'secret', rarity: 'legendary', xpReward: 500, condition: { type: 'consecutive_days', days: 7, action: 'full_day_complete' } },

  // --- Listening (11) — tracked client-side via useListeningStats ---
  { id: 'listener_1hr', title: 'First Hour', description: '1 hour of total listening', icon: '🎵', category: 'dedication', rarity: 'common', xpReward: 30, condition: { type: 'count', action: 'listening_minutes', count: 60 } },
  { id: 'listener_5hr', title: 'Dedicated Listener', description: '5 hours of total listening', icon: '🎧', category: 'dedication', rarity: 'rare', xpReward: 100, condition: { type: 'count', action: 'listening_minutes', count: 300 } },
  { id: 'listener_10hr', title: 'Sound Devotee', description: '10 hours of total listening', icon: '🎶', category: 'dedication', rarity: 'rare', xpReward: 150, condition: { type: 'count', action: 'listening_minutes', count: 600 } },
  { id: 'listener_100hr', title: 'Audio Legend', description: '100 hours of total listening', icon: '👑', category: 'dedication', rarity: 'legendary', xpReward: 500, condition: { type: 'count', action: 'listening_minutes', count: 6000 } },
  { id: 'flow_master', title: 'Flow Master', description: '60+ minute listening session', icon: '🌊', category: 'mastery', rarity: 'rare', xpReward: 75, condition: { type: 'count', action: 'longest_session', count: 60 } },
  { id: 'deep_flow', title: 'Deep Flow', description: '2+ hour listening session', icon: '🧘', category: 'mastery', rarity: 'epic', xpReward: 200, condition: { type: 'count', action: 'longest_session', count: 120 } },
  { id: 'genre_explorer_audio', title: 'Sound Seeker', description: 'Played 5 different genres', icon: '🧭', category: 'explorer', rarity: 'rare', xpReward: 75, condition: { type: 'count', action: 'unique_genres', count: 5 } },
  { id: 'all_genres', title: 'Genre Master', description: 'Played all 7 music genres', icon: '🎹', category: 'explorer', rarity: 'epic', xpReward: 200, condition: { type: 'count', action: 'unique_genres', count: 7 } },
  { id: 'listening_streak_7', title: 'Weekly Listener', description: '7-day listening streak', icon: '🔥', category: 'consistency', rarity: 'common', xpReward: 50, condition: { type: 'consecutive_days', days: 7, action: 'listening' } },
  { id: 'listening_streak_30', title: 'Monthly Listener', description: '30-day listening streak', icon: '💎', category: 'consistency', rarity: 'epic', xpReward: 300, condition: { type: 'consecutive_days', days: 30, action: 'listening' } },
  { id: 'midnight_listener', title: 'Midnight Listener', description: 'Listened between midnight and 5 AM', icon: '🌙', category: 'secret', rarity: 'common', xpReward: 25, condition: { type: 'time_range', start: 0, end: 5, action: 'listening' } },
]

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id)
}

export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category)
}

/**
 * Check which achievements should be newly unlocked based on user stats.
 * Returns only achievements that are NOT already in the unlockedIds set.
 */
export interface AchievementStats {
    streak: number
    totalXP: number
    level: number
    journalCount: number
    moodLogCount: number
    breathingCount: number
    moduleCount: number
    fullDayCount: number
    weekendActiveCount: number
    uniqueGenres: number
    uniqueModuleTypes: number
    hasFirstJournal: boolean
    hasFirstSoundscape: boolean
    hasFirstRoutine: boolean
    hasCompletedGoal: boolean
    hasFirstPathComplete: boolean
    pathCompleteCount: number
    consecutivePathDays: number
    consecutiveVirtueDays: number
    currentHour: number
    consecutiveFullDays: number
    /** Optional so callers that don't load era rows can't unlock era badges by accident. */
    era?: EraAchievementStats
    /** Same reasoning: absent means no practice badge can be awarded. */
    practice?: PracticeAchievementStats
    /** Same again for proof days and Right now sessions. */
    record?: RecordAchievementStats
}

/**
 * The achievements a given reader should see.
 *
 * Retired ones are dropped unless they already hold them — otherwise seven
 * badges sat permanently at zero in "Next up", counting against a
 * denominator nobody could ever close.
 */
export function visibleAchievements(unlockedIds: Set<string>): Achievement[] {
  return ACHIEVEMENTS.filter(a => !a.retired || unlockedIds.has(a.id))
}

function eraValue(e: EraAchievementStats): Record<EraMetric, number> {
  return {
    promises_made: e.promisesMade,
    promises_kept: e.promisesKept,
    promise_streak: e.longestPromiseStreak,
    eras_started: e.erasStarted,
    eras_completed: e.erasCompleted,
    perfect_eras: e.perfectEras,
    custom_eras: e.customEras,
    comebacks: e.comebacks,
    carried_forward: e.carriedForward,
    eras_reflected: e.erasReflected,
    era_returns: e.eraReturns,
  }
}

function recordValue(r: RecordAchievementStats): Record<RecordMetric, number> {
  return { proof_days: r.proofDays, resets_done: r.resetsDone, resets_helped: r.resetsHelped }
}

export function checkNewAchievements(
  stats: AchievementStats,
  unlockedIds: Set<string>
): Achievement[] {
  const newlyUnlocked: Achievement[] = []

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) continue
    // A retired achievement can never be newly awarded: the thing it counted
    // is gone, so any unlock now would be an accident of leftover data.
    if (achievement.retired) continue

    const c = achievement.condition
    let qualified = false

    switch (c.type) {
      case 'streak':
        qualified = stats.streak >= c.days
        break
      case 'first_action':
        if (c.action === 'journal') qualified = stats.hasFirstJournal
        else if (c.action === 'soundscape') qualified = stats.hasFirstSoundscape
        else if (c.action === 'routine') qualified = stats.hasFirstRoutine
        else if (c.action === 'goal_complete') qualified = stats.hasCompletedGoal
        else if (c.action === 'path_complete') qualified = stats.hasFirstPathComplete
        break
      case 'count':
        if (c.action === 'journal') qualified = stats.journalCount >= c.count
        else if (c.action === 'mood_log') qualified = stats.moodLogCount >= c.count
        else if (c.action === 'breathingSession') qualified = stats.breathingCount >= c.count
        else if (c.action === 'moduleComplete') qualified = stats.moduleCount >= c.count
        else if (c.action === 'full_day_complete') qualified = stats.fullDayCount >= c.count
        else if (c.action === 'weekend_active') qualified = stats.weekendActiveCount >= c.count
        else if (c.action === 'unique_genres') qualified = stats.uniqueGenres >= c.count
        else if (c.action === 'unique_modules') qualified = stats.uniqueModuleTypes >= c.count
        else if (c.action === 'path_complete') qualified = stats.pathCompleteCount >= c.count
        break
      case 'xp_total':
        qualified = stats.totalXP >= c.amount
        break
      case 'level':
        qualified = stats.level >= c.level
        break
      case 'time_range':
        if (c.start < c.end) {
          qualified = stats.currentHour >= c.start && stats.currentHour < c.end
        } else {
          // Wraps around midnight (e.g., 22-4)
          qualified = stats.currentHour >= c.start || stats.currentHour < c.end
        }
        break
      case 'consecutive_days':
        if (c.action === 'path_activity') qualified = stats.consecutivePathDays >= c.days
        else if (c.action === 'virtue_track') qualified = stats.consecutiveVirtueDays >= c.days
        else qualified = stats.consecutiveFullDays >= c.days
        break
    }

    if (c.type === 'era' && stats.era) {
      qualified = eraValue(stats.era)[c.metric] >= c.count
    }

    if (c.type === 'era_finished' && stats.era) {
      qualified = stats.era.completedKeys.includes(c.eraKey)
    }

    if (c.type === 'record' && stats.record) {
      qualified = recordValue(stats.record)[c.metric] >= c.count
    }

    if (c.type === 'practice' && stats.practice) {
      const p = stats.practice
      const value: Record<PracticeMetric, number> = {
        practices_kept: p.practicesKept,
        minimum_days: p.minimumDays,
        practice_run: p.longestPracticeRun,
        disciplines_kept: p.disciplinesKept,
        practice_comebacks: p.practiceComebacks,
        exercises_done: p.exercisesDone,
        exercise_days: p.exerciseDays,
        exercise_variety: p.exerciseVariety,
        books_finished: p.booksFinished,
      }
      qualified = value[c.metric] >= c.count
    }

    if (qualified) {
      newlyUnlocked.push(achievement)
    }
  }

  return newlyUnlocked
}

// ─── Display helpers ─────────────────────────────────────────────────────────

function compact(n: number): string {
  if (n >= 1000) return `${Math.round(n / 100) / 10}K`.replace('.0K', 'K')
  return String(n)
}

/**
 * The stamp on an achievement's coin — what tells two badges in the same
 * category apart at a glance. Its number where it has one ("7", "30", "365",
 * "2K"), otherwise null and the badge shows the achievement's own glyph.
 */
export function achievementMark(a: Achievement): string | null {
  const c = a.condition
  switch (c.type) {
    case 'streak': return String(c.days)
    case 'consecutive_days': return String(c.days)
    case 'count': return c.count > 1 ? compact(c.count) : null
    case 'xp_total': return compact(c.amount)
    case 'level': return `L${c.level}`
    case 'era': return c.count > 1 ? String(c.count) : null
    case 'practice': return c.count > 1 ? String(c.count) : null
    case 'record': return c.count > 1 ? String(c.count) : null
    default: return null
  }
}

/**
 * How far a locked achievement is, where that's measurable: { current,
 * target }, current capped at target. Null for one-off or time-of-day ones,
 * and for anything whose stat isn't loaded — never a guessed number.
 */
export function achievementProgress(a: Achievement, stats: AchievementStats): { current: number; target: number } | null {
  const c = a.condition
  const of = (current: number, target: number) => ({ current: Math.min(current, target), target })
  switch (c.type) {
    case 'streak': return of(stats.streak, c.days)
    case 'xp_total': return of(stats.totalXP, c.amount)
    case 'level': return of(stats.level, c.level)
    case 'count': {
      const v: Record<string, number> = {
        journal: stats.journalCount,
        mood_log: stats.moodLogCount,
        breathingSession: stats.breathingCount,
        moduleComplete: stats.moduleCount,
        full_day_complete: stats.fullDayCount,
        weekend_active: stats.weekendActiveCount,
        unique_genres: stats.uniqueGenres,
        unique_modules: stats.uniqueModuleTypes,
      }
      return c.action in v ? of(v[c.action], c.count) : null
    }
    case 'era': {
      if (!stats.era) return null
      return of(eraValue(stats.era)[c.metric], c.count)
    }
    case 'record': {
      if (!stats.record) return null
      return of(recordValue(stats.record)[c.metric], c.count)
    }
    case 'practice': {
      if (!stats.practice) return null
      const p = stats.practice
      const v: Record<PracticeMetric, number> = {
        practices_kept: p.practicesKept,
        minimum_days: p.minimumDays,
        practice_run: p.longestPracticeRun,
        disciplines_kept: p.disciplinesKept,
        practice_comebacks: p.practiceComebacks,
        exercises_done: p.exercisesDone,
        exercise_days: p.exerciseDays,
        exercise_variety: p.exerciseVariety,
        books_finished: p.booksFinished,
      }
      return of(v[c.metric], c.count)
    }
    default: return null
  }
}
