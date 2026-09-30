/**
 * Rescue — when the day is slipping, compress what's left to its minimums.
 *
 * Not a punishment and not a reset: "nothing is ruined". The plan is every
 * discipline still due today, each at the minimum the person wrote for it,
 * in clock order. Accepting it changes how the rest of the day ASKS (the
 * minimum becomes the primary answer); it never records anything by itself.
 *
 * ── WHEN ──────────────────────────────────────────────────────────────
 *
 * After 3pm with two or more disciplines still due, or at any hour once one
 * has slipped (planned time over an hour gone) and another is still due.
 * One thing open is not a rescue, it's just the next thing.
 *
 * ── HONESTY ───────────────────────────────────────────────────────────
 *
 * A total ("about 50 minutes") only when EVERY step's minimum is written in
 * minutes — "10 pages" has no honest duration, and a partial sum would
 * understate the ask.
 *
 * Pure.
 */

import { minutesOf, SLIP_AFTER, type PulseInput } from './engine'

export interface RescueStep {
  id: string
  title: string
  /** The minimum, as they wrote it — or 'the smallest version'. */
  ask: string
}

export interface RescuePlan {
  reason: string
  steps: RescueStep[]
  /** Sum of the minimums, only when every one is in minutes. */
  minutes: number | null
}

export const RESCUE_FROM = 15 * 60

function plannedTime(id: string, input: PulseInput): string | null {
  return input.steps.find(s => s.ref === id && s.time && s.weight !== 'bad_day')?.time ?? null
}

/** "20 minutes", "20 min", "20m", "1 hour" → minutes; anything else → null. */
export function minutesIn(ask: string): number | null {
  const s = ask.trim().toLowerCase()
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)\.?$/)
  if (m) return Math.round(Number(m[1]))
  const h = s.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\.?$/)
  if (h) return Math.round(Number(h[1]) * 60)
  return null
}

export function rescuePlan(input: PulseInput): RescuePlan | null {
  const due = input.practices.filter(p => p.state === 'due')
  // Once accepted, the plan holds until its last step is done — it must not
  // vanish at one left while the sheets still lead with the minimum.
  if (due.length < (input.rescueOn ? 1 : 2)) return null

  const slipped = due.some(p => {
    const t = plannedTime(p.id, input)
    return t !== null && input.now > minutesOf(t) + SLIP_AFTER
  })
  if (!input.rescueOn && input.now < RESCUE_FROM && !slipped) return null

  const steps = due
    .map((p, i) => ({ p, i, t: plannedTime(p.id, input) }))
    .sort((a, b) => (a.t ? minutesOf(a.t) : Infinity) - (b.t ? minutesOf(b.t) : Infinity) || a.i - b.i)
    .map(({ p }) => ({ id: p.id, title: p.label, ask: p.todaysMinimum?.trim() || 'the smallest version' }))

  const each = steps.map(s => minutesIn(s.ask))
  const minutes = each.every((m): m is number => m !== null) ? each.reduce((a, b) => a + b, 0) : null

  return {
    reason: `${steps.length === 1 ? 'One thing is' : `${steps.length} things are`} still open. Nothing is ruined — here's the day at its minimum.`,
    steps,
    minutes,
  }
}

/** Spoken version, in Voxu's voice. Personal (their disciplines), so premium. */
export function rescueScript(plan: RescuePlan): string {
  const list = plan.steps.map(s => `${s.title}: ${s.ask}`).join('. ')
  const total = plan.minutes ? ` About ${plan.minutes} minutes, all of it.` : ''
  return `Nothing is ruined. The rest of today is just the minimums. ${list}.${total} One at a time. Then close the day.`.slice(0, 560)
}
