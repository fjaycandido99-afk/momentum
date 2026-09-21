import { previousDay } from '@/lib/era/logic'
import { PRACTICE_LIMITS, PRESETS_BY_KEY } from './presets'

/**
 * What a practice asks of today, and what the record says.
 *
 * Pure: days, minimums and logs go in, a status comes out. Nothing here
 * reads a clock — the user's local day is passed in, the same convention as
 * lib/era/logic.ts.
 *
 * Nothing here computes a score either. Adherence is a count and its
 * denominator ("9 of 12 training days"), because 75% of a number nobody can
 * see is how a progress screen starts lying.
 */

export type PracticeState =
  /** Expected today, nothing said yet. */
  | 'due'
  /** Done today, at least the minimum. */
  | 'done'
  /** Only the minimum happened — still a kept day, and worth saying. */
  | 'minimum'
  /** Expected today and they said no. */
  | 'missed'
  /** Not expected today. */
  | 'rest'

export interface PracticeLite {
  id: string
  label: string
  /** Weekdays it's expected, 0 = Sunday. Empty means every day. */
  days: number[]
  minimum: string
}

export interface LogLite {
  day: string
  done: boolean
  minimumOnly: boolean
}

/** The day of the week for a YYYY-MM-DD, 0 = Sunday, by arithmetic. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Is this practice expected on that day? */
export function isDueOn(practice: PracticeLite, day: string): boolean {
  if (practice.days.length === 0) return true
  return practice.days.includes(weekdayOf(day))
}

export function stateOn(practice: PracticeLite, logs: LogLite[], day: string): PracticeState {
  const log = logs.find(l => l.day === day)
  if (log) {
    if (!log.done) return 'missed'
    return log.minimumOnly ? 'minimum' : 'done'
  }
  return isDueOn(practice, day) ? 'due' : 'rest'
}

/**
 * Kept days out of expected days, over a window.
 *
 * Only days the practice was DUE count in the denominator: a Sunday off is
 * not a failure, and counting it as one would make every schedule look
 * broken.
 */
export function adherence(
  practice: PracticeLite,
  logs: LogLite[],
  from: string,
  to: string,
): { done: number; of: number } {
  const byDay = new Map(logs.map(l => [l.day, l]))
  let done = 0
  let of = 0
  for (let day = to; day >= from; day = previousDay(day)) {
    if (!isDueOn(practice, day)) continue
    of++
    if (byDay.get(day)?.done) done++
  }
  return { done, of }
}

/**
 * Consecutive DUE days kept, counting back from today (or from yesterday, so
 * the run survives a day that hasn't been answered yet).
 */
export function currentRun(practice: PracticeLite, logs: LogLite[], today: string): number {
  const byDay = new Map(logs.map(l => [l.day, l]))
  let run = 0
  let day = today
  // Today unanswered doesn't break anything — it hasn't happened yet.
  if (!byDay.has(today)) day = previousDay(today)
  // Bounded so a long history can't walk forever.
  for (let i = 0; i < 400; i++) {
    if (isDueOn(practice, day)) {
      const log = byDay.get(day)
      if (!log?.done) break
      run++
    }
    day = previousDay(day)
  }
  return run
}

/**
 * The last seven days, oldest first — what the strip on the card draws.
 *
 * Seven dots say more than a percentage: you can see that the misses were
 * Monday and Tuesday, which is the thing worth knowing.
 */
export function weekStrip(practice: PracticeLite, logs: LogLite[], today: string): { day: string; state: PracticeState }[] {
  const days: string[] = []
  let day = today
  for (let i = 0; i < 7; i++) {
    days.unshift(day)
    day = previousDay(day)
  }
  return days.map(d => ({ day: d, state: stateOn(practice, logs, d) }))
}

/**
 * The line that does the work.
 *
 * Not encouragement — a reminder of the floor THEY set, when they set it
 * calmly, to be read on a day when they are not calm.
 */
export function minimumLine(practice: PracticeLite): string {
  const min = practice.minimum.trim()
  if (!min) return `You set this yourself. Do the smallest version of it today.`
  return `You said your minimum is ${min}. Don’t negotiate — just start that.`
}

/**
 * The night nudge: one ask, about practices that were due today and have no
 * answer yet.
 *
 * Quotes their own floor when there is one thing left, because that is the
 * sentence that works at 9pm ("you said thirty minutes"). With more than one
 * it names them instead of stacking floors — a notification is one line, and
 * three minimums in it is a form.
 *
 * Returns null when there is nothing to ask about, so the caller can't send
 * an empty nudge.
 */
export function nightNudge(
  unanswered: PracticeLite[],
): { title: string; body: string } | null {
  if (unanswered.length === 0) return null

  if (unanswered.length === 1) {
    const one = unanswered[0]
    const min = one.minimum.trim()
    return {
      title: one.label,
      body: min ? `You said ${min}. Did it happen?` : 'Did it happen today?',
    }
  }

  const labels = unanswered.map(p => p.label)
  const list = labels.length === 2
    ? `${labels[0]} and ${labels[1]}`
    : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
  // Two or three, because three practices is the cap.
  const count = unanswered.length === 2 ? 'Two' : unanswered.length === 3 ? 'Three' : String(unanswered.length)
  return {
    title: `${count} things to close out`,
    body: `${list} — did they happen?`,
  }
}

/** "Mon, Tue, Thu, Fri" — or "Every day". */
export function daysLabel(days: number[]): string {
  if (days.length === 0 || days.length === 7) return 'Every day'
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const sorted = [...new Set(days)].filter(d => d >= 0 && d <= 6).sort()
  if (sorted.length === 5 && sorted.join() === '1,2,3,4,5') return 'Weekdays'
  if (sorted.length === 2 && sorted.join() === '0,6') return 'Weekends'
  return sorted.map(d => names[d]).join(', ')
}

/**
 * What the app is told about a practice.
 *
 * Lives in the pure layer, not beside the loader: the cards are client
 * components, and a type imported from a Prisma-backed module is one
 * careless edit away from pulling Prisma into the browser bundle.
 */
export interface PracticeWire {
  id: string
  presetKey: string
  label: string
  days: number[]
  minimum: string
  blocker: string | null
  /** Where today stands. */
  state: PracticeState
  /** Kept days out of due days over the last four weeks. */
  done: number
  of: number
  /** Consecutive due days kept. */
  run: number
  /** The last seven days, oldest first. */
  week: { day: string; state: PracticeState }[]
  /**
   * Which session of their own split is next ("Pull"), where the preset
   * defines a rotation. Never programming — see lib/practices/cues.ts.
   */
  cue: string | null
  /** A Voxu session that fits this practice, when the app actually has one. */
  session: { exerciseId: string; title: string; minutes: number } | null
  /** Today's slot in their own plan — "Pull", "Monday", "Every day". */
  slot: { key: string; label: string } | null
  /** What they wrote for today. Their words; Voxu never parses them. */
  todaysPlan: string[]
  /** The whole plan, for the editor. */
  plan: Record<string, string[]> | null
}

export interface PracticesPayload {
  practices: PracticeWire[]
  today: string
  /** How many more they can add. */
  remaining: number
  max: number
}

export interface PracticeInput {
  presetKey: unknown
  label?: unknown
  days?: unknown
  minimum?: unknown
  blocker?: unknown
}

export interface CleanPractice {
  presetKey: string
  label: string
  days: number[]
  minimum: string
}

/**
 * Validate what the client sent. A practice needs a real preset, a name and
 * a minimum; everything else falls back to the preset's own defaults.
 */
export function cleanPractice(input: PracticeInput): CleanPractice | { error: string } {
  const presetKey = typeof input.presetKey === 'string' ? input.presetKey : ''
  const preset = PRESETS_BY_KEY.get(presetKey)
  if (!preset) return { error: 'Pick one of the practices' }

  const label = (typeof input.label === 'string' ? input.label : '').trim() || preset.label
  if (label.length > PRACTICE_LIMITS.label) return { error: 'That name is too long' }

  const minimum = (typeof input.minimum === 'string' ? input.minimum : '').trim() || preset.minimum
  if (!minimum) return { error: 'What is the smallest version that still counts?' }
  if (minimum.length > PRACTICE_LIMITS.minimum) return { error: 'Keep the minimum short' }

  const days = Array.isArray(input.days)
    ? [...new Set(input.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
    : preset.days

  return { presetKey, label, days, minimum }
}

export function isCleanPractice(value: CleanPractice | { error: string }): value is CleanPractice {
  return !('error' in value)
}
