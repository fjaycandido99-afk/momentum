import type { ReadTarget } from './alignment'

/**
 * What makes each era its own program rather than a label on the same loop.
 *
 *  - `coachFocus`   added to the coach's prompt, so Gym Arc talks training and
 *                   recovery while Comeback Season stays gentle.
 *  - `soundscapeId` / `guideId`  the app content this era leans on, surfaced on
 *                   the era card so the whole app points at the goal. Ids must
 *                   exist in SOUNDSCAPE_ITEMS (components/player/SoundscapePlayer)
 *                   and VOICE_GUIDES (components/home/home-types).
 *
 * Daily missions live in missions.ts; stages in logic.ts (eraStage).
 * Keys match lib/era/presets.ts, plus 'custom' for eras people name themselves.
 */

export interface EraProgram {
  coachFocus: string
  soundscapeId: string
  guideId: string
  /**
   * Hero art, served from /public (e.g. '/era/locked_in.jpg'). Leave unset
   * until the file is actually committed — the hero renders text-only
   * without it, and a path to a missing file would show a broken image.
   */
  image?: string
  /**
   * The Daily Read axis this era is trying to move, and which way — see
   * lib/era/alignment. Unset for custom eras: their goal is the user's own
   * words, and guessing an axis for "Dad Mode" would be making it up.
   */
  readTarget?: ReadTarget
  /**
   * How the rest of the app leans toward this era (lib/era/content). Each is
   * a preference, never a filter: the era's pick comes first, nothing else
   * is hidden.
   *  - motivationTopic: a TOPIC_NAMES entry (components/home/home-types)
   *  - musicGenre: a MUSIC_GENRES id, moved to the front of the music shelf
   *  - quoteCategories: MINDSET_QUOTES categories the daily quote draws from
   *  - journalQuestion: tonight's era prompt in the Journal
   */
  motivationTopic?: string
  musicGenre?: string
  quoteCategories?: string[]
  journalQuestion: string
}

/** Art for the "Who are you becoming?" hero shown before an era starts. */
export const ERA_START_IMAGE: string | undefined = '/era/start.jpg'

/** Art for a finished era — the summit at sunrise, whatever the era was. */
export const ERA_COMPLETE_IMAGE = '/era/complete.jpg'

export const ERA_PROGRAMS: Record<string, EraProgram> = {
  locked_in: {
    coachFocus:
      'Focus: the one important thing they keep avoiding. Push toward starting it early and finishing before distractions win. Name drift plainly when you see it.',
    soundscapeId: 'focus',
    guideId: 'focus_meditation',
    image: '/era/locked_in.jpg',
    motivationTopic: 'Focus',
    musicGenre: 'study',
    quoteCategories: ['focus', 'action'],
    journalQuestion: "Where did you hold your focus today, and where did it slip?",
    readTarget: { axis: 'discipline', direction: 1 },
  },
  discipline: {
    coachFocus:
      "Focus: acting without waiting for motivation. Treat feelings as weather, not instructions. Small, non-negotiable reps beat heroic days.",
    soundscapeId: 'energy',
    guideId: 'affirmation',
    image: '/era/discipline.jpg',
    motivationTopic: 'Discipline',
    musicGenre: 'lofi',
    quoteCategories: ['action', 'strength'],
    journalQuestion: "What did you do today even though you didn't feel like it?",
    readTarget: { axis: 'discipline', direction: 1 },
  },
  comeback: {
    coachFocus:
      'Focus: rebuilding after a hard stretch. Be gentle and steady — no pressure, no shame, no comparison to who they were. Every small step back counts.',
    soundscapeId: 'relax',
    guideId: 'emotional_reset',
    image: '/era/comeback.jpg',
    motivationTopic: 'Resilience',
    musicGenre: 'piano',
    quoteCategories: ['resilience', 'growth'],
    journalQuestion: "What small step back did you take today? Be kind about the rest.",
    readTarget: { axis: 'faith', direction: 1 },
  },
  gym_arc: {
    coachFocus:
      'Focus: showing up for their body consistently. Training, recovery and sleep all count. Never encourage training through pain, and never give diet, calorie or weight advice.',
    soundscapeId: 'energy',
    guideId: 'breathing',
    image: '/era/gym_arc.jpg',
    motivationTopic: 'Hustle',
    quoteCategories: ['strength', 'action'],
    journalQuestion: "How did your body feel today, and did you show up for it?",
    readTarget: { axis: 'discipline', direction: 1 },
  },
  stoic_mode: {
    coachFocus:
      "Focus: the dichotomy of control. Help them separate what's theirs to act on from what isn't, and respond instead of react.",
    soundscapeId: 'rain',
    guideId: 'anxiety',
    image: '/era/stoic_mode.jpg',
    motivationTopic: 'Mindset',
    musicGenre: 'classical',
    quoteCategories: ['wisdom', 'resilience'],
    journalQuestion: "What happened today that wasn't yours to control, and how did you respond?",
    readTarget: { axis: 'agency', direction: -1 },
  },
  confidence: {
    coachFocus:
      'Focus: speaking up and taking up space. Celebrate the attempt, not the outcome. Discomfort is the sign they did it.',
    soundscapeId: 'energy',
    guideId: 'confidence',
    image: '/era/confidence.jpg',
    motivationTopic: 'Confidence',
    musicGenre: 'jazz',
    quoteCategories: ['strength', 'action'],
    journalQuestion: "When did you speak up today, and when did you hold back?",
    readTarget: { axis: 'agency', direction: 1 },
  },
  study: {
    coachFocus:
      'Focus: deep, undistracted study blocks and real recall over re-reading. Protect the first focused hour; the phone is the enemy of the block.',
    soundscapeId: 'focus',
    guideId: 'focus_meditation',
    image: '/era/study.jpg',
    motivationTopic: 'Focus',
    musicGenre: 'study',
    quoteCategories: ['wisdom', 'focus'],
    journalQuestion: "What do you understand today that you didn't yesterday?",
    readTarget: { axis: 'inquiry', direction: 1 },
  },
  five_am: {
    coachFocus:
      'Focus: owning the early morning — the wake-up itself, no phone first, and a sane bedtime the night before. Sleep is part of the plan, not the obstacle.',
    soundscapeId: 'energy',
    guideId: 'breathing',
    image: '/era/five_am.jpg',
    motivationTopic: 'Discipline',
    musicGenre: 'piano',
    quoteCategories: ['action', 'purpose'],
    journalQuestion: "How did your first hour go, and what will you do tonight to protect tomorrow's?",
    readTarget: { axis: 'discipline', direction: 1 },
  },
  custom: {
    coachFocus:
      'Focus: the change they named on day 1. Keep every reply tied to that, in their own terms.',
    soundscapeId: 'focus',
    guideId: 'breathing',
    image: '/era/custom.jpg',
    journalQuestion: 'What did today do for the change you named on day 1?',
  },
}

export function programFor(eraKey: string): EraProgram {
  return ERA_PROGRAMS[eraKey] ?? ERA_PROGRAMS.custom
}
