import { exerciseById, type Exercise } from '@/lib/exercises/library'

/**
 * Nervous-System mode: the one place in Voxu that stops asking for more.
 *
 * The rest of the app exists to get someone to do the harder thing. That is
 * the wrong instruction for a person who is overwhelmed at 11pm, and an app
 * that only knows how to push is an app people quietly delete on their worst
 * week. So: four states someone can say out loud, and for each one, a few
 * minutes of regulation instead of motivation.
 *
 * What it is NOT: treatment, triage or diagnosis. It offers four things to
 * do with your body and your attention, all of them Voxu's own sessions
 * (lib/exercises REGULATION_EXERCISES). Anything that sounds like a crisis
 * goes to the crisis banner the journal already uses — that path is not
 * replaced by a breathing exercise.
 *
 * The era does not lose today for this. Coming here is not a missed day, and
 * the copy says so: the promise waits.
 */

export type ResetStateId = 'overwhelmed' | 'unfocused' | 'wired' | 'sleepless'

export interface ResetState {
  id: ResetStateId
  /** How someone would say it — first person, no jargon. */
  label: string
  /** One line of recognition, before any instruction. */
  recognise: string
  /** The exercise this routes to (lib/exercises/library.ts). */
  exerciseId: string
  /** The scale's question, and its five words from easiest to hardest. */
  scale: { question: string; labels: [string, string, string, string, string] }
}

export const RESET_STATES: ResetState[] = [
  {
    id: 'overwhelmed',
    label: 'I’m overwhelmed',
    recognise: 'Too much at once. Nothing has to be solved in the next three minutes.',
    exerciseId: 'regulate_grounding',
    scale: {
      question: 'How overwhelmed, right now?',
      labels: ['Barely', 'A bit', 'A lot', 'Badly', 'Can’t think'],
    },
  },
  {
    id: 'unfocused',
    label: 'I can’t focus',
    recognise: 'Usually too many open things, not a broken brain.',
    exerciseId: 'regulate_one_thing',
    scale: {
      question: 'How scattered, right now?',
      labels: ['Barely', 'A bit', 'A lot', 'Badly', 'All over'],
    },
  },
  {
    id: 'wired',
    label: 'I can’t calm down',
    recognise: 'You can’t decide to be calm. You can change how you’re breathing.',
    exerciseId: 'regulate_exhale',
    scale: {
      question: 'How wound up, right now?',
      labels: ['Barely', 'A bit', 'A lot', 'Badly', 'Shaking'],
    },
  },
  {
    id: 'sleepless',
    label: 'I can’t sleep',
    recognise: 'Your head is still holding tomorrow. Let’s put it down.',
    exerciseId: 'regulate_put_day_down',
    scale: {
      question: 'How awake, right now?',
      labels: ['Nearly asleep', 'Drowsy', 'Awake', 'Wide awake', 'Wired'],
    },
  },
]

export const RESET_STATES_BY_ID = new Map(RESET_STATES.map(s => [s.id, s]))

export function resetState(id: string | null | undefined): ResetState | null {
  return id ? RESET_STATES_BY_ID.get(id as ResetStateId) ?? null : null
}

export function exerciseForState(id: string): Exercise | null {
  const state = resetState(id)
  return state ? exerciseById(state.exerciseId) : null
}

export function isResetState(value: unknown): value is ResetStateId {
  return typeof value === 'string' && RESET_STATES_BY_ID.has(value as ResetStateId)
}

/** 1–5, or null. Same shape as everywhere else that takes a self-report. */
export function parseLevel(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isInteger(n) || n < 1 || n > 5) return null
  return n
}

/**
 * What to say afterwards.
 *
 * Reports the two numbers they gave and nothing else. No "your stress fell
 * 40%", no claim that Voxu did it — they sat down for four minutes and said
 * how it was before and after, and that is exactly what this says. It also
 * refuses to spin a rise: a session that didn't help said so, and being
 * told it worked when it didn't is how someone stops believing the app.
 */
export function deltaLine(
  state: ResetState,
  before: number | null,
  after: number | null,
): string {
  if (before === null || after === null) return 'You took the time. That’s the whole thing.'
  const words = state.scale.labels
  const from = words[before - 1]
  const to = words[after - 1]
  if (after < before) return `You came in at “${from}”. You’re leaving at “${to}”.`
  if (after === before) return `Still “${to}” — but you stopped and tried, which is not nothing.`
  return `Up from “${from}” to “${to}”. Some nights it doesn’t land. That’s worth knowing too.`
}
