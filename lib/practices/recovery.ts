import { previousDay } from '@/lib/era/logic'
import { SPLIT_ROTATIONS } from './cues'
import { isDueOn, type LogLite, type PracticeLite } from './logic'
import { slotsFor } from './plan'

/**
 * What to say after a missed session.
 *
 * The instinct an app usually serves here is "you broke your streak, do
 * double tomorrow". Both halves are wrong: the streak is not the point, and
 * doubling up is how people injure themselves and then quit. A missed
 * session is a scheduling problem, so this offers scheduling answers.
 *
 * Pure: the practice, its logs and today go in; a prompt or null comes out.
 */

/** How far back a miss is still worth mentioning. */
export const RECOVERY_WINDOW_DAYS = 3

export interface Recovery {
  /** The day that was missed. */
  day: string
  /** "Tuesday" — for the sentence. */
  dayLabel: string
  /** Which slot of their plan it was, if the practice has slots. */
  slotKey: string | null
  slotLabel: string | null
  /**
   * True when the rotation already carries it: a split advances on sessions
   * KEPT, so a missed Pull day means today is still Pull and there is
   * nothing to move. The prompt then reassures instead of offering options.
   */
  carried: boolean
}

/**
 * The most recent missed day inside the window, or null.
 *
 * Only days they ANSWERED "no" count. An unanswered day is unknown — it
 * might have happened — and telling someone they missed a session they
 * never reported on is the app inventing a failure.
 */
export function findRecovery(
  practice: PracticeLite & { presetKey: string },
  logs: LogLite[],
  today: string,
  sessionsKept: number,
): Recovery | null {
  const byDay = new Map(logs.map(l => [l.day, l]))
  const rotation = SPLIT_ROTATIONS[practice.presetKey]
  const carried = !!rotation && rotation.length > 1

  let day = previousDay(today)
  for (let i = 0; i < RECOVERY_WINDOW_DAYS; i++) {
    const log = byDay.get(day)
    if (log && !log.done && isDueOn(practice, day)) {
      // Which slot that day was. For a rotation, the missed session is the
      // one still up next (the rotation didn't advance), so it's today's.
      const slots = slotsFor({ presetKey: practice.presetKey, days: practice.days })
      const slot = carried
        ? slots[Math.max(0, Math.floor(sessionsKept)) % slots.length] ?? null
        : slots.find(s => s.key === dayKeyOf(day)) ?? null
      return {
        day,
        dayLabel: labelFor(day, today),
        slotKey: slot?.key ?? null,
        slotLabel: slot?.label ?? null,
        carried,
      }
    }
    day = previousDay(day)
  }
  return null
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function dayKeyOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return DAY_KEYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/** "Yesterday", or the weekday's name. */
function labelFor(day: string, today: string): string {
  if (day === previousDay(today)) return 'Yesterday'
  const [y, m, d] = day.split('-').map(Number)
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

export interface RecoveryCopy {
  line: string
  /** What the options say. Empty when the rotation already handled it. */
  options: { key: 'move' | 'continue' | 'minimum'; label: string }[]
}

/**
 * The prompt.
 *
 * Never "you broke your streak", and never "make it up on top of today" —
 * the options are move it, carry on, or do the floor. All three are fine
 * answers, which is the point: the app is helping schedule, not judging.
 */
export function recoveryCopy(
  recovery: Recovery,
  practice: { minimum: string },
  dueToday: boolean,
): RecoveryCopy {
  const what = recovery.slotLabel ? `${recovery.dayLabel}’s ${recovery.slotLabel}` : recovery.dayLabel

  if (recovery.carried) {
    // Nothing to reschedule: the rotation held its place.
    return {
      line: `You missed ${what}. Nothing moved — it’s still what’s next.`,
      options: [],
    }
  }

  if (!dueToday) {
    return {
      line: `You missed ${what}. Today isn’t a scheduled day — you can do it anyway, or leave it.`,
      options: [
        { key: 'move', label: `Do ${recovery.slotLabel ?? 'it'} today` },
        { key: 'continue', label: 'Leave it' },
      ],
    }
  }

  return {
    line: `You missed ${what}. Don’t double up — pick one.`,
    options: [
      { key: 'move', label: `Do ${recovery.slotLabel ?? 'that one'} instead` },
      { key: 'continue', label: 'Carry on as planned' },
      { key: 'minimum', label: practice.minimum ? `Just the minimum (${practice.minimum})` : 'Just the minimum' },
    ],
  }
}
