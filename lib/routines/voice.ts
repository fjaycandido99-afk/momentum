/**
 * The notification, in their coach's voice.
 *
 * "One honest line is enough" is Voxu's line for everybody. The Stoic's coach
 * and the Hustler's coach would not say the same thing at 21:30, and the
 * routine is the one surface where the app speaks to somebody unprompted —
 * so it is the surface where a generic line is most obviously generic.
 *
 * Three constraints, and the first is structural:
 *
 * IT MUST BE CACHED. Notifications are scheduled on the device and fire
 * offline; nothing can call a model when one goes off. So a line is written
 * once at save, stored on the step, and read by the scheduler. A step with no
 * line falls back to the kind's own cue, exactly as before.
 *
 * IT SAYS NOTHING NEW. The cue is a nudge toward a step they already wrote,
 * not advice, not a fact, not a number. A notification is the worst place in
 * the app for a model to invent something: it arrives with no context, no
 * screen and no way to ask what it meant.
 *
 * IT IS SHORT. iOS truncates a notification body at roughly two lines, and a
 * cue that needs three is a cue nobody reads.
 *
 * Pure. The call lives in app/api/routines/voice.
 */

import { ROUTINE_STEP_KINDS, STEP_KINDS, type RoutineStepKind } from './steps'

/** Long enough for a sentence, short enough to survive a lock screen. */
export const CUE_LIMIT = 90

export interface VoiceStep {
  kind: RoutineStepKind
  /** Their own words for the step, where there are any. */
  title: string
  /** HH:MM, or null in sequence mode. */
  time: string | null
}

export const VOICE_SYSTEM_PROMPT = [
  'You write the one line a phone notification says, in the voice of the',
  'coach described below.',
  '',
  'Return ONLY JSON: {"cues":["…","…"]} — one string per step, in order.',
  '',
  'Each line:',
  `- At most ${CUE_LIMIT} characters. A lock screen shows two short lines.`,
  '- Points at the step they already chose. It adds nothing: no advice, no',
  '  facts, no numbers, no counts, no promises about results.',
  '- Never says how long it will take or how they will feel afterwards.',
  '- Never scolds, never assumes they skipped anything, never says "again".',
  '- Second person, present tense. No emoji. No hashtags. No exclamation',
  '  marks stacked up.',
  '- Do not repeat the step’s name back at them — the notification title',
  '  already says it.',
  '',
  'Write like someone who knows them nudging them once, and then leaving',
  'them alone.',
].join('\n')

export function buildVoicePrompt(steps: readonly VoiceStep[], eraTitle?: string | null): string {
  const lines = ['THE STEPS, in order:']

  steps.forEach((step, i) => {
    const when = step.time ? ` at ${step.time}` : ''
    lines.push(`${i + 1}. ${step.title}${when} (${STEP_KINDS[step.kind].label})`)
  })

  if (eraTitle) {
    lines.push('', `They are in their ${eraTitle}. You may lean on that; you may not invent details of it.`)
  }

  lines.push('', `Return ${steps.length} cue${steps.length === 1 ? '' : 's'}, in that order.`)
  return lines.join('\n')
}

/**
 * Lines a cue may never contain.
 *
 * The same shape of guard as lib/books/summary: a rule that only lives in a
 * prompt is a rule that holds most of the time, and "most of the time" is not
 * good enough for something that arrives on a lock screen unannounced.
 */
const BANNED = [
  // A number about their life that they did not give. "10 minutes", "3 sets".
  /\b\d+\s*(min|mins|minute|minutes|hour|hours|page|pages|rep|reps|set|sets|km|miles?|%)\b/i,
  // Claims about outcome or feeling.
  // Both the contraction and the long form: the first version of this
  // caught "you'll feel better" and let "you will feel better" straight
  // through, which is the same promise.
  /\byou(?:'|’)?(?:ll| will) (?:feel|be|have|sleep|thank)\b/i,
  /\b(?:science|studies|research|proven|scientifically)\b/i,
  // Scolding, or assuming a miss.
  /\b(?:again|still|finally|no excuses|don'?t be lazy|you missed|you skipped|slacking)\b/i,
  // Streak and score language, which the rest of the app refuses.
  /\b(?:streak|score|rating|on track|behind|catch up)\b/i,
] as const

export type CueProblem = 'EMPTY' | 'TOO_LONG' | 'BANNED' | 'ECHOES_TITLE'

/**
 * Is this cue usable? Null when it is.
 *
 * Checked per cue rather than per response, so one bad line costs one line:
 * the step keeps the kind's own cue and every other step still gets its
 * voice. An all-or-nothing rule here would throw away seven good lines
 * because of one.
 */
export function validateCue(cue: unknown, step: VoiceStep): CueProblem | null {
  if (typeof cue !== 'string') return 'EMPTY'
  const text = cue.trim().replace(/\s+/g, ' ')
  if (!text) return 'EMPTY'
  if (text.length > CUE_LIMIT) return 'TOO_LONG'
  for (const pattern of BANNED) if (pattern.test(text)) return 'BANNED'

  // A cue that just says the step's name back is the notification title
  // twice. Only when that is ALL it says.
  const title = step.title.trim().toLowerCase()
  if (title && text.toLowerCase().replace(/[.!?]+$/, '') === title) return 'ECHOES_TITLE'

  return null
}

export interface VoicedCue {
  /** The step this belongs to, by its position in what was sent. */
  index: number
  cue: string
}

/**
 * The cues worth keeping, with everything else silently left behind.
 *
 * A step whose cue was refused is simply absent from the result, and the
 * caller leaves that step's `cue` null — which means the kind's own line,
 * which is what every routine had before this existed. Failure here is
 * invisible rather than broken.
 */
export function toCues(
  response: { cues?: unknown },
  steps: readonly VoiceStep[],
): VoicedCue[] {
  const raw = Array.isArray(response?.cues) ? response.cues : []
  const kept: VoicedCue[] = []

  steps.forEach((step, index) => {
    const cue = raw[index]
    if (validateCue(cue, step)) return
    kept.push({ index, cue: (cue as string).trim().replace(/\s+/g, ' ') })
  })

  return kept
}

/** Every kind has a fallback line already, which is what makes failure safe. */
export function hasFallbackForEveryKind(): boolean {
  return ROUTINE_STEP_KINDS.every(kind => kind === 'own' || STEP_KINDS[kind].cue.length > 0)
}
