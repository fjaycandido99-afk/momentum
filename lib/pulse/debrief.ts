/**
 * The night debrief — the day, closed, in a few spoken sentences.
 *
 * Built only from what was RECORDED today (Pulse's Today list and the era's
 * promise): what was done, what was done at the minimum, what didn't happen,
 * whether tomorrow is set. Nothing is inferred and nothing is scored.
 *
 * ── RULES ─────────────────────────────────────────────────────────────
 *
 * - A miss is said once, flatly, and followed by "nothing to make up" —
 *   never guilt, never a streak, never "try harder".
 * - The minimum is said as what it is: it counts.
 * - It ends by closing the day: "You're done for tonight" — the loop's own
 *   "Tomorrow is ready" when tomorrow's promise exists, else the one thing
 *   left to do.
 * - Under the chat-voice cap (600 characters), shortest parts dropped first.
 *
 * Pure.
 */

import type { TodayItem } from './engine'

export interface DebriefInput {
  era: { title: string; day: number } | null
  /** Pulse's Today list, as recorded. */
  items: TodayItem[]
  /** Tomorrow's promise already written tonight. */
  tomorrowReady: boolean
}

export const DEBRIEF_MAX = 560

/** "A", "A and B", "A, B and C". */
export function listOf(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '')

export function buildDebrief(input: DebriefInput): string {
  const { era, items } = input
  const disc = items.filter(i => i.kind === 'discipline')
  const done = disc.filter(i => i.status === 'done').map(i => clean(i.title))
  const minimum = disc.filter(i => i.status === 'minimum').map(i => clean(i.title))
  const missed = disc.filter(i => i.status === 'missed').map(i => clean(i.title))
  const open = disc.filter(i => i.status === 'due' || i.status === 'upcoming').map(i => clean(i.title))
  const promise = items.find(i => i.kind === 'promise')
  const mission = items.find(i => i.kind === 'mission')

  const parts: (string | null)[] = []
  parts.push(era ? `Day ${era.day} of ${clean(era.title)} is nearly done.` : 'The day is nearly done.')

  if (promise) {
    parts.push(
      promise.status === 'kept' ? 'You kept your promise.'
        : promise.status === 'missed' ? "Today's promise didn't happen. Nothing to make up."
        : promise.title.startsWith('Make') ? null
        : "You haven't said yet whether you kept your promise.",
    )
  }
  if (done.length) parts.push(`You did ${listOf(done)}.`)
  if (minimum.length) parts.push(`${listOf(minimum)} at the minimum. That counts.`)
  if (mission?.status === 'done') parts.push('And you did the mission.')
  if (missed.length) parts.push(`${listOf(missed)} didn't happen today. Nothing to make up tomorrow.`)
  if (open.length) parts.push(`${listOf(open)} ${open.length === 1 ? 'is' : 'are'} still open, if there's time.`)

  parts.push(
    input.tomorrowReady
      ? "Tomorrow's promise is set. You're done for tonight."
      : "Write tomorrow's promise while today is fresh. Then you're done for tonight.",
  )

  // Over the cap: drop the open list, then the missed list — the close of
  // the day is what this is for.
  let lines = parts.filter((p): p is string => !!p)
  const tryDrop = (pred: (s: string) => boolean) => {
    if (lines.join(' ').length > DEBRIEF_MAX) lines = lines.filter(l => !pred(l))
  }
  tryDrop(l => l.endsWith("if there's time."))
  tryDrop(l => l.includes("didn't happen today"))
  let script = lines.join(' ')
  if (script.length > DEBRIEF_MAX) script = `${script.slice(0, DEBRIEF_MAX - 1).replace(/\s+\S*$/, '')}…`
  return script
}
