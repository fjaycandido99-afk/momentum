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

/**
 * Timed or sequence — the spine of the feature.
 *
 * Every argument about drag handles, per-step times and how many
 * notifications to send resolves differently depending on this one value,
 * which is why it is stored rather than guessed from whether times are set.
 *
 *   timed     the clock is the order. Nothing to drag. A reminder per step.
 *   sequence  they tap Start and are walked through it. The order is theirs,
 *             so dragging is the only way to express it, and there is one
 *             reminder for the start instead of seven.
 */
export type RoutineMode = 'timed' | 'sequence'

export const ROUTINE_MODES: readonly RoutineMode[] = ['timed', 'sequence']

export function isRoutineMode(value: unknown): value is RoutineMode {
  return value === 'timed' || value === 'sequence'
}

export interface StepLite {
  kind: RoutineStepKind
  ref?: string | null
  label?: string | null
  /** Required in timed mode, absent in sequence mode. */
  time?: string | null
  position?: number
  /** Does it survive a bad day? See Minimum mode. */
  inMinimum?: boolean
  /** Their own smaller floor, for a step of their own. */
  minimum?: string | null
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
 * The day in order — which depends entirely on the mode.
 *
 * TIMED: the clock decides, and position only breaks a tie, so two steps at
 * 07:00 do not swap places between renders. A list that reorders itself while
 * you look at it is one you stop trusting.
 *
 * SEQUENCE: position IS the order. There are no times to sort by, and this is
 * exactly why dragging is worth building in that mode and meaningless in the
 * other.
 */
export function sortSteps<T extends { time?: string | null; position?: number }>(
  steps: readonly T[],
  mode: RoutineMode = 'timed',
): T[] {
  if (mode === 'sequence') {
    return [...steps].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }
  return [...steps].sort((a, b) => {
    const at = a.time ?? ''
    const bt = b.time ?? ''
    if (at !== bt) return at < bt ? -1 : 1
    return (a.position ?? 0) - (b.position ?? 0)
  })
}

/**
 * The steps that survive a bad day, in order.
 *
 * "Never break the identity. Shrink the routine when needed." A Minimum Day
 * runs only these, at whatever smaller floor each one carries.
 */
export function minimumSteps<T extends { inMinimum?: boolean; time?: string | null; position?: number }>(
  steps: readonly T[],
  mode: RoutineMode = 'timed',
): T[] {
  return sortSteps(steps.filter(s => s.inMinimum), mode)
}

/**
 * Can a Minimum Day be offered at all?
 *
 * False when they have marked nothing, and then the UI says so rather than
 * offering a mode that would run an empty day. The alternative — defaulting
 * every step into the minimum — would mean a "bad day" that asks for
 * everything, which is the opposite of the idea.
 */
export function canRunMinimum(steps: readonly { inMinimum?: boolean }[]): boolean {
  return steps.some(s => s.inMinimum)
}

export type StepError = 'BAD_KIND' | 'BAD_TIME' | 'MISSING_REF' | 'MISSING_LABEL' | 'TOO_MANY'

/**
 * Whether a set of steps can be saved, and why not.
 *
 * Returns the first problem rather than a list: the editor fixes one thing at
 * a time, and a wall of errors for a form this small is noise.
 */
export function validateSteps(
  steps: readonly StepLite[],
  mode: RoutineMode = 'timed',
): StepError | null {
  if (steps.length > MAX_ROUTINE_STEPS) return 'TOO_MANY'

  for (const step of steps) {
    if (!isRoutineStepKind(step.kind)) return 'BAD_KIND'
    // A time is required in timed mode and meaningless in sequence mode,
    // where a step happens when the one before it is done. Demanding one
    // there would make people invent times for a routine that has none.
    if (mode === 'timed' && !isValidTime(step.time)) return 'BAD_TIME'

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
