/**
 * One line a week about how the routine is going.
 *
 * I argued against this feature and Francis asked for it anyway, so it is
 * built with the argument turned into code rather than dropped:
 *
 * COST. A cron that wrote everybody an observation every Monday is one model
 * call per user per week whether they read it or not. This is computed when
 * somebody OPENS their review, and cached on the routine for that week — so
 * a person who never looks costs nothing, and a person who looks ten times
 * costs one call.
 *
 * HONESTY. The model is given COUNTS ONLY, never text, and it is forbidden
 * from explaining them. "You started 5 of 7 and both days you didn't were
 * Sundays" is a fact about a calendar. "You keep your promise 31% more often
 * when you run your routine" is a coin flip with a decimal point, and with
 * seven rows there is no comparison to make at all. The guard below rejects
 * a percentage, a causal claim and a prediction outright, because a rule that
 * only lives in a prompt holds most of the time.
 *
 * SILENCE IS ALLOWED. With fewer than three days of evidence there is nothing
 * worth saying, and the honest output is nothing. Most weeks, for most
 * people, that is the answer.
 *
 * Pure. The call lives in app/api/routines/observation.
 */

import type { RoutineReview } from './review'

/** Below this many started days, a week has nothing to say about itself. */
export const MIN_DAYS_FOR_OBSERVATION = 3

/** One line, and a lock screen's worth of it. */
export const OBSERVATION_LIMIT = 160

export interface ObservationInput {
  review: RoutineReview
  routineLabel: string
  /** Which weekdays it is meant to run. Empty means every day. */
  days: number[]
  eraTitle?: string | null
}

export const OBSERVATION_SYSTEM_PROMPT = [
  'You write ONE sentence about somebody’s week of keeping a routine.',
  '',
  'Return ONLY JSON: {"line":"…"}',
  '',
  'You are given counts. You may:',
  '- State them back with their denominator ("5 of the last 7 days").',
  '- Name WHICH days, when the days are given to you.',
  '- Ask a question about a day they did not start.',
  '',
  'You may NOT:',
  '- Give a percentage, a rate, a score, a grade or a streak.',
  '- Explain WHY anything happened, or claim one thing caused another.',
  '- Predict anything, or promise what will happen if they keep going.',
  '- Congratulate or scold. Not "well done", not "you need to".',
  '- Mention anything you were not given. You do not know what they did on',
  '  any particular day, only whether the routine was begun.',
  '',
  `At most ${OBSERVATION_LIMIT} characters. One sentence. No emoji.`,
  '',
  'If the counts do not support a sentence worth reading, return',
  '{"line":""} — silence is a valid answer and a better one than filler.',
].join('\n')

/** The weekday names, Sunday first, matching Routine.days. */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function buildObservationPrompt(input: ObservationInput): string {
  const { review, routineLabel, days, eraTitle } = input

  const lines = [
    `ROUTINE: ${routineLabel}`,
    days.length > 0
      ? `MEANT TO RUN ON: ${days.map(d => DAY_NAMES[d] ?? '').filter(Boolean).join(', ')}`
      : 'MEANT TO RUN: every day',
    `STARTED: ${review.started} of the last ${review.days} days`,
    `WALKED TO THE END: ${review.completed} of those`,
    `KEPT AS A MINIMUM DAY: ${review.minimumDays}`,
  ]

  // Named days, so "both were Sundays" is available as a fact rather than
  // something the model has to infer from a number.
  const missed = review.marks.filter(m => m.state === 'none').map(m => weekdayOf(m.day))
  if (missed.length > 0 && missed.length <= 4) {
    lines.push(`DAYS NOT STARTED: ${missed.join(', ')}`)
  }

  if (eraTitle) lines.push(`THEIR ERA: ${eraTitle}`)

  lines.push('', 'One sentence, or an empty line.')
  return lines.join('\n')
}

/** "2026-09-21" → "Monday". Empty for anything that is not a date. */
export function weekdayOf(day: string): string {
  const parsed = Date.parse(`${day}T00:00:00Z`)
  if (!Number.isFinite(parsed)) return ''
  return DAY_NAMES[new Date(parsed).getUTCDay()] ?? ''
}

/**
 * The Monday of the week a local day falls in, as YYYY-MM-DD.
 *
 * The cache key. A week, not a rolling seven days, so the line changes on a
 * boundary somebody can feel rather than whenever they happen to open it.
 */
export function weekKey(localDay: string): string {
  const parsed = Date.parse(`${localDay}T00:00:00Z`)
  if (!Number.isFinite(parsed)) return ''
  const d = new Date(parsed)
  // getUTCDay: 0 = Sunday. Monday-first, so Sunday belongs to the week that
  // started six days earlier.
  const shift = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - shift)
  return d.toISOString().slice(0, 10)
}

/** Is there enough of a week to say anything about it? */
export function worthObserving(review: RoutineReview): boolean {
  return review.started >= MIN_DAYS_FOR_OBSERVATION
}

/**
 * Everything an observation may never contain.
 *
 * This list IS the argument I lost, kept as code. Each pattern is a thing
 * that turns a count into a claim.
 */
const BANNED: readonly RegExp[] = [
  // The one from the spec. Any percentage at all.
  /%|\bpercent/i,
  /\b\d+(?:\.\d+)?\s*(?:x|times)\s+(?:more|less|likely|often)\b/i,
  /\bmore often\b/i,
  // Causation, in all its usual clothes.
  /\bbecause\b/i,
  // "is why" rather than "which is why": "that is why your week held
  // together" is the same claim in different clothes.
  /\b(?:causes?|caused|leads? to|means that|is why|due to|thanks to)\b/i,
  /\bwhen you .{0,30}\byou\b.{0,20}\b(?:always|never|tend to|usually)\b/i,
  // Prediction and promise.
  /\b(?:will|going to|you'?ll)\s+(?:feel|see|get|become|be able)\b/i,
  /\bkeep (?:this|it) up\b/i,
  // Scores, grades, streaks.
  /\b(?:score|grade|rating|streak|consistency|adherence|on track|behind)\b/i,
  // Praise and scolding, which the review deliberately does not do.
  /\b(?:well done|great job|amazing|impressive|proud of you|you need to|you should|try harder)\b/i,
]

export type ObservationProblem = 'EMPTY' | 'TOO_LONG' | 'BANNED' | 'MULTI_SENTENCE'

/**
 * Check the line. Null when it may be shown.
 *
 * EMPTY is not a failure — the prompt offers silence as an answer and the
 * caller stores nothing. Everything else is refused and nothing is shown,
 * because the version of this feature that breaks these rules is worse than
 * not having it.
 */
export function validateObservation(line: unknown): ObservationProblem | null {
  if (typeof line !== 'string') return 'EMPTY'
  const text = line.trim().replace(/\s+/g, ' ')
  if (!text) return 'EMPTY'
  if (text.length > OBSERVATION_LIMIT) return 'TOO_LONG'

  // One sentence. Two is where the second one starts explaining the first.
  const sentences = text.split(/[.!?]+\s+/).filter(Boolean)
  if (sentences.length > 1) return 'MULTI_SENTENCE'

  for (const pattern of BANNED) if (pattern.test(text)) return 'BANNED'

  return null
}

/** The line, cleaned, or null if it may not be shown. */
export function toObservation(response: { line?: unknown }): string | null {
  if (validateObservation(response?.line)) return null
  return (response.line as string).trim().replace(/\s+/g, ' ')
}
