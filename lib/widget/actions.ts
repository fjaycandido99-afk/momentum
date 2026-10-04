/**
 * The widget's buttons — pure, shared by the action route and the snapshot.
 *
 *   promise_done   today's promise, kept (the normal check-in path)
 *   checkin        mood Low / Okay / Good → 2 / 3 / 4 on the 1–5 scale; only
 *                  when wellness check-ins are on (their consent)
 *   tomorrow_keep  tomorrow's promise from the suggestion
 *
 * The suggestion is today's own promise, never a guess: the same again if
 * they kept it, a smaller version if they didn't, and it says which.
 */

import { easierPromise } from '@/lib/onboarding/first-launch'

export const WIDGET_ACTIONS = ['promise_done', 'checkin', 'tomorrow_keep'] as const
export type WidgetAction = (typeof WIDGET_ACTIONS)[number]

export const CHECKIN_MOOD = { low: 2, okay: 3, good: 4 } as const
export type CheckinLevel = keyof typeof CHECKIN_MOOD

export function isWidgetAction(v: unknown): v is WidgetAction {
  return typeof v === 'string' && (WIDGET_ACTIONS as readonly string[]).includes(v)
}
export function checkinMood(level: unknown): number | null {
  return typeof level === 'string' && level in CHECKIN_MOOD ? CHECKIN_MOOD[level as CheckinLevel] : null
}

export interface TomorrowSuggestion {
  text: string
  /** Why this one — said plainly. */
  why: string
}

export function tomorrowSuggestion(
  today: { text: string; kept: boolean | null } | null,
  tomorrowWritten: boolean,
  /** Tomorrow is their hard weekday (a SOLID law): suggest the smaller one, and say so. */
  weakTomorrow: string | null = null,
): TomorrowSuggestion | null {
  if (!today || tomorrowWritten) return null
  const text = today.text.trim()
  if (!text) return null
  if (weakTomorrow) return { text: easierPromise(text), why: `Smaller — ${weakTomorrow}s have been harder for you` }
  if (today.kept === false) {
    const easier = easierPromise(text)
    return { text: easier, why: 'A smaller version of today’s' }
  }
  return { text, why: today.kept === true ? 'You kept this today' : 'Today’s promise, again' }
}

/** The check-in card's state: ask, already answered, or check-ins are off. */
export function checkinState(wellness: { on: boolean; checkedToday: boolean } | null | undefined): 'ask' | 'done' | 'off' {
  if (!wellness?.on) return 'off'
  return wellness.checkedToday ? 'done' : 'ask'
}
