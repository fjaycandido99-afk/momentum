/**
 * A routine: the day, as the person arranged it.
 *
 * Home shows Today's Audio, the mission, the promise, the exercise and the
 * disciplines as a fixed stack in a fixed order. That order is Voxu's guess
 * at everyone's day. A routine lets somebody say what theirs actually is —
 * audio at 7, the promise at 7:30, the gym at 18:00, reading at 21:30 — and
 * be reminded at each one.
 *
 * It REMINDS; it does not record. A discipline asks whether you did it and
 * keeps a run. A routine tells you when. If both recorded, every user would
 * face an arbitrary choice about which to put something in.
 *
 * Pure. Scheduling lives in the client (Capacitor LocalNotifications), the
 * rows in app/api/routines.
 */

export const ROUTINE_STEP_KINDS = [
  'audio',
  'promise',
  'exercise',
  'practice',
  'journal',
  'reset',
  'own',
] as const

export type RoutineStepKind = (typeof ROUTINE_STEP_KINDS)[number]

export interface StepKindMeta {
  label: string
  /** What the notification says when they have not written their own line. */
  cue: string
  /** Where tapping it goes. Null for 'own' — there is nothing to open. */
  href: string | null
  /** Needs a `ref` to say WHICH one. */
  needsRef: boolean
}

export const STEP_KINDS: Record<RoutineStepKind, StepKindMeta> = {
  audio: {
    label: 'Today’s audio',
    cue: 'Your session for this part of the day.',
    href: '/',
    needsRef: false,
  },
  promise: {
    label: 'Today’s promise',
    cue: 'One promise, in your own words.',
    href: '/',
    needsRef: false,
  },
  exercise: {
    label: 'Today’s exercise',
    cue: 'The one exercise for today.',
    href: '/training',
    needsRef: false,
  },
  practice: {
    label: 'A discipline',
    cue: 'One of the things you keep.',
    href: '/training',
    needsRef: true,
  },
  journal: {
    label: 'Journal',
    cue: 'One honest line is enough.',
    href: '/journal',
    needsRef: false,
  },
  reset: {
    label: 'Nervous-System mode',
    cue: 'The one that asks nothing of you.',
    href: '/reset',
    needsRef: false,
  },
  own: {
    // The escape hatch, and the reason this can be "any routine": phone out
    // of the room, bag by the door, call your mum. Voxu has no screen for
    // those and does not need one to remind you.
    label: 'Something of your own',
    cue: '',
    href: null,
    needsRef: false,
  },
}

export function isRoutineStepKind(value: unknown): value is RoutineStepKind {
  return typeof value === 'string' && (ROUTINE_STEP_KINDS as readonly string[]).includes(value)
}

/** One routine, one day: 8 moments is already a lot to be reminded of. */
export const MAX_ROUTINE_STEPS = 8
export const ROUTINE_LIMITS = { label: 40, stepLabel: 60 } as const

export interface StepLite {
  kind: RoutineStepKind
  ref?: string | null
  label?: string | null
  time: string
  position?: number
}

/**
 * A valid HH:MM, 24-hour.
 *
 * Strict on purpose: this string is parsed into an hour and a minute for a
 * notification that has to fire at the right time for months. "7:5" or
 * "25:00" reaching the scheduler would either throw or fire at an hour
 * nobody asked for.
 */
export function isValidTime(time: unknown): time is string {
  if (typeof time !== 'string') return false
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  return match !== null
}

/** HH:MM to { hour, minute }, for the scheduler. Null when it is not a time. */
export function parseTime(time: string): { hour: number; minute: number } | null {
  if (!isValidTime(time)) return null
  const [h, m] = time.split(':')
  return { hour: Number(h), minute: Number(m) }
}

/** "7:30 am" — how a time reads in a list, not how it is stored. */
export function timeLabel(time: string): string {
  const parsed = parseTime(time)
  if (!parsed) return time
  const { hour, minute } = parsed
  const suffix = hour < 12 ? 'am' : 'pm'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return `${twelve}:${String(minute).padStart(2, '0')} ${suffix}`
}

/**
 * The day in order.
 *
 * By time, then by position. Position exists only to break a tie: two steps
 * at 07:00 would otherwise swap places between renders, and a list that
 * reorders itself while you look at it is a list you stop trusting.
 */
export function sortSteps<T extends { time: string; position?: number }>(steps: readonly T[]): T[] {
  return [...steps].sort((a, b) => {
    if (a.time !== b.time) return a.time < b.time ? -1 : 1
    return (a.position ?? 0) - (b.position ?? 0)
  })
}

export type StepError = 'BAD_KIND' | 'BAD_TIME' | 'MISSING_REF' | 'MISSING_LABEL' | 'TOO_MANY'

/**
 * Whether a set of steps can be saved, and why not.
 *
 * Returns the first problem rather than a list: the editor fixes one thing at
 * a time, and a wall of errors for a form this small is noise.
 */
export function validateSteps(steps: readonly StepLite[]): StepError | null {
  if (steps.length > MAX_ROUTINE_STEPS) return 'TOO_MANY'

  for (const step of steps) {
    if (!isRoutineStepKind(step.kind)) return 'BAD_KIND'
    if (!isValidTime(step.time)) return 'BAD_TIME'

    const meta = STEP_KINDS[step.kind]
    if (meta.needsRef && !step.ref?.trim()) return 'MISSING_REF'
    // "Something of your own" with no words is a reminder that says nothing.
    if (step.kind === 'own' && !step.label?.trim()) return 'MISSING_LABEL'
  }

  return null
}

/**
 * What the notification says.
 *
 * Their own line wins whenever they wrote one — it is what they will
 * recognise at 21:30. The kind's cue is the fallback, and the era is named
 * only when there is one. Nothing here invents advice about what they should
 * be doing: the step already says that.
 */
export function stepNotification(
  step: StepLite,
  eraTitle?: string | null,
): { title: string; body: string } {
  const meta = STEP_KINDS[step.kind]
  const own = step.label?.trim()

  const title = own || meta.label
  const body = own && meta.cue && step.kind !== 'own'
    ? meta.cue
    : eraTitle
      ? `For your ${eraTitle}.`
      : meta.cue || 'Part of your routine.'

  return { title, body }
}

/**
 * The notification id for the Nth step.
 *
 * LocalNotifications keys everything by a single integer, and
 * NOTIFICATION_IDS already owns 1–8 (morning, evening, checkpoints, streak,
 * weekly review, bedtime). Starting at 9000 leaves that alone and leaves room
 * for anything added between.
 */
export const ROUTINE_NOTIFICATION_BASE = 9000

export function stepNotificationId(index: number): number {
  return ROUTINE_NOTIFICATION_BASE + index
}

/** Every id a routine could occupy, for cancelling before rescheduling. */
export function allStepNotificationIds(): number[] {
  return Array.from({ length: MAX_ROUTINE_STEPS }, (_, i) => stepNotificationId(i))
}
