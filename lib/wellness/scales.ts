/**
 * The daily wellness check-in: four taps and some optional context.
 *
 * Self-reported state, and nothing more. There is no anxiety score here, no
 * depression score, no sleep quality inferred from a phone — those would be
 * clinical claims a motivation app has no business making, and a number
 * someone reads as a diagnosis can do real harm. What this holds is what the
 * person said about their own day, on scales they can see.
 *
 * Everything is optional, one field at a time: a day where they only said
 * "slept badly" is still a day worth keeping. And none of it is collected
 * until they turn it on (UserPreferences.wellness_enabled).
 */

export const SCORE_MIN = 1
export const SCORE_MAX = 5

export type ScaleId = 'mood' | 'energy' | 'stress' | 'rested'

export interface Scale {
  id: ScaleId
  /** The question, in the second person. */
  question: string
  /** 1 → 5, in order. The words are the scale; the number is just storage. */
  labels: [string, string, string, string, string]
  /** True when a HIGH number is the harder end (stress), for honest wording. */
  highIsHard?: boolean
}

export const SCALES: Scale[] = [
  {
    id: 'mood',
    question: 'How do you feel?',
    labels: ['Awful', 'Low', 'Okay', 'Good', 'Great'],
  },
  {
    id: 'energy',
    question: 'Energy?',
    labels: ['Drained', 'Low', 'Okay', 'Good', 'Full'],
  },
  {
    id: 'stress',
    question: 'Stress?',
    labels: ['Calm', 'Settled', 'Some', 'High', 'Overwhelmed'],
    highIsHard: true,
  },
  {
    id: 'rested',
    question: 'How rested do you feel?',
    labels: ['Exhausted', 'Tired', 'Okay', 'Rested', 'Fully rested'],
  },
]

export const SCALES_BY_ID = new Map(SCALES.map(s => [s.id, s]))

/**
 * What was going on — a closed list, so it can be counted across days and
 * people without reading anyone's words. KEYS are the contract; relabel
 * freely, never rename.
 */
export const CONTEXT_TAGS: { key: string; label: string }[] = [
  { key: 'work', label: 'Work' },
  { key: 'money', label: 'Money' },
  { key: 'family', label: 'Family' },
  { key: 'relationship', label: 'Relationship' },
  { key: 'school', label: 'School' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'health', label: 'Health' },
  { key: 'alone', label: 'Felt alone' },
  { key: 'good_day', label: 'Just a good day' },
]

const TAG_KEYS = new Set(CONTEXT_TAGS.map(t => t.key))

/** More than a few tags stops being context and starts being a checklist. */
export const MAX_TAGS = 3

export function parseScore(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isInteger(n) || n < SCORE_MIN || n > SCORE_MAX) return null
  return n
}

export function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  for (const raw of value) {
    if (typeof raw === 'string' && TAG_KEYS.has(raw)) seen.add(raw)
    if (seen.size >= MAX_TAGS) break
  }
  return [...seen]
}

export function tagLabel(key: string): string {
  return CONTEXT_TAGS.find(t => t.key === key)?.label ?? key
}

export function scoreLabel(id: ScaleId, score: number | null | undefined): string | null {
  if (!score) return null
  return SCALES_BY_ID.get(id)?.labels[score - 1] ?? null
}

/**
 * The line shown wherever this is collected or explained. Said plainly and
 * kept short, because a disclaimer nobody reads protects nobody.
 */
export const WELLNESS_NOTE =
  'Voxu is not a medical app. These are your own notes about your own day — not a diagnosis, and never a screening for anything.'

/** What the consent card promises, and what the privacy policy must match. */
export const WELLNESS_PROMISES: string[] = [
  'Four taps a day, all optional, and only on days you feel like it.',
  'It is used to show you your own patterns — and, counted with everyone else’s, to see whether Voxu actually helps.',
  'Never sold, never shared with other users, never used to train a model.',
  'In your data export, and deletable on its own at any time.',
]
