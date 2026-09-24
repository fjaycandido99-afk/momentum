/**
 * What the phone will actually do with a routine.
 *
 * A routine that only draws a timeline is a picture of a day. The notification
 * at 18:00 is the product. So the plan — which notifications, at which times,
 * on which days, saying what — is computed here, purely, and a thin client
 * hands it to Capacitor. Everything that can be got wrong about somebody's
 * morning is testable without a phone.
 *
 * Two shapes, because the modes mean different things:
 *
 * TIMED — one notification per step. The reminders ARE the routine; there is
 * no moment you begin it.
 *
 * SEQUENCE — one notification, for the start. The steps have no clock times,
 * so reminding somebody about step four would be a guess about when they got
 * to it, and being told "Journal" at a time you invented is how an app
 * teaches you to ignore it.
 *
 * Pure. Scheduling lives in components/routines/useRoutineSchedule.
 */

import {
  MAX_ROUTINE_STEPS,
  ROUTINE_HREF,
  STEP_KINDS,
  parseTime,
  sortSteps,
  stepNotification,
  stepNotificationId,
  stepWeight,
  type RoutineMode,
  type StepLite,
} from './steps'

/** Where the routine lives. Kept as an alias so the plan reads plainly. */
export const ROUTINE_HOME = ROUTINE_HREF

export interface PlannedNotification {
  id: number
  title: string
  body: string
  hour: number
  minute: number
  /**
   * Capacitor's weekday: 1 = Sunday … 7 = Saturday. Absent means every day.
   *
   * Deliberately NOT our 0–6: this number goes straight into the plugin, and
   * converting it at the edge rather than three layers in is the difference
   * between one translation and a whole class of off-by-one reminders.
   */
  weekday?: number
  /** Where tapping it goes. Always somewhere: see ROUTINE_HOME. */
  route: string
}

export interface RoutineForSchedule {
  label: string
  mode: RoutineMode
  start_time: string | null
  days: number[]
  enabled: boolean
  steps: StepLite[]
}

/**
 * iOS keeps 64 pending notifications and silently drops the rest. The core
 * reminders (NOTIFICATION_IDS 1–8) already have eight of them, so a routine
 * gets a budget rather than whatever it happens to want — and it is spent on
 * the earliest steps, because a day that reminds you about its morning and
 * forgets its evening is better than one that has quietly lost both.
 */
export const MAX_PLANNED_NOTIFICATIONS = 48

/** 0 = Sunday here, 1 = Sunday for the plugin. */
export function toPluginWeekday(day: number): number {
  return day + 1
}

/**
 * The days a routine fires on, as the plugin wants them.
 *
 * Empty means every day — the same convention as Practice.days — and so does
 * all seven: seven weekday-specific notifications per step would cost seven
 * times the budget to say exactly what one repeating daily notification says.
 */
function scheduleDays(days: number[]): (number | null)[] {
  const clean = [...new Set(days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
  if (clean.length === 0 || clean.length === 7) return [null]
  return clean
}

/**
 * Every notification a routine wants, in the order they will fire.
 *
 * A disabled routine plans nothing, which is what makes disabling it mean
 * something: the rows stay, the reminders stop.
 */
export function planRoutine(
  routine: RoutineForSchedule | null,
  eraTitle?: string | null,
): PlannedNotification[] {
  if (!routine || routine.enabled === false) return []

  const days = scheduleDays(routine.days)
  const planned: PlannedNotification[] = []

  if (routine.mode === 'sequence') {
    // One nudge to begin, and only if they asked for one. A sequence routine
    // with no start time is one somebody starts when they are ready, and
    // Voxu has nothing to add to that.
    const at = parseTime(routine.start_time)
    if (!at) return []

    for (const day of days) {
      planned.push({
        // Slot on step 0: a sequence routine has exactly one notification,
        // and reusing the block means switching modes cancels cleanly.
        id: stepNotificationId(0, day),
        title: routine.label,
        body: eraTitle ? `Start your ${eraTitle} day.` : 'Start your routine.',
        hour: at.hour,
        minute: at.minute,
        ...(day === null ? {} : { weekday: toPluginWeekday(day) }),
        // Where the routine is, so the nudge lands on the Start button
        // rather than somewhere they have to navigate from.
        route: ROUTINE_HOME,
      })
    }

    return planned
  }

  /*
    Only REQUIRED steps are reminded about, and this is the whole difference
    the weight makes.

    An optional step is one somebody said they would do if the day allowed
    it; a notification for that is how a person learns to swipe all of them
    away, and the one at 07:00 they actually needed goes with the rest. A
    bad-days-only step is decided in the moment, so a daily reminder for it
    would fire on every day it does not apply to.

    The index for the id is taken from the FULL list, not the filtered one:
    ids must stay stable per step so that changing a step's weight cancels
    its own notification instead of shifting every id after it.
  */
  const steps = sortSteps(routine.steps, 'timed').slice(0, MAX_ROUTINE_STEPS)

  steps.forEach((step, i) => {
    if (stepWeight(step.weight) !== 'required') return

    const at = parseTime(step.time)
    // A step with no usable time is skipped rather than defaulted. There is
    // no honest hour to pick, and firing at midnight would be worse than
    // silence.
    if (!at) return

    const { title, body } = stepNotification(step, eraTitle)

    for (const day of days) {
      planned.push({
        id: stepNotificationId(i, day),
        title,
        body,
        hour: at.hour,
        minute: at.minute,
        ...(day === null ? {} : { weekday: toPluginWeekday(day) }),
        // Where the step lives. A step of their own has no screen, so it
        // opens where the routine is — tapping a reminder and arriving
        // nowhere is how somebody learns not to tap them.
        route: STEP_KINDS[step.kind].href ?? ROUTINE_HOME,
      })
    }
  })

  // Earliest first, then trimmed: the budget is spent on the start of the
  // day, which is the part a routine is usually for.
  planned.sort((a, b) => a.hour - b.hour || a.minute - b.minute || a.id - b.id)

  return planned.slice(0, MAX_PLANNED_NOTIFICATIONS)
}
