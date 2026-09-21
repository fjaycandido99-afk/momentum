import { SPLIT_ROTATIONS } from './cues'
import { daysLabel, weekdayOf, type PracticeLite } from './logic'

/**
 * What YOU do on each day of your practice.
 *
 * Voxu does not write training programmes and never will — it doesn't know
 * your injuries, your equipment or your experience, and apps built for that
 * exist. What it can do is hold the plan you already have and put the right
 * part of it in front of you on the right day: Monday's list on Monday.
 *
 * So these lines are the user's own text, stored and shown back, never
 * parsed and never suggested. "Bench 4×8" is a note to themselves, not data
 * Voxu interprets — which is also why this does not turn the app into a
 * workout tracker: nothing here is counted, progressed or graded.
 *
 * Slots come from the practice, not from us:
 *  - a split the preset names (Push/Pull/Legs, Upper/Lower) → one slot per
 *    rotation position, advanced by sessions kept;
 *  - anything else → one slot per scheduled day, so a Mon/Wed/Fri practice
 *    gets three lists.
 */

export const PLAN_MAX_ITEMS = 12
export const PLAN_MAX_ITEM_LENGTH = 80

/** A plan is slot key → the lines for that slot. */
export type PracticePlan = Record<string, string[]>

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface PlanSlot {
  key: string
  label: string
}

/**
 * The slots this practice has.
 *
 * An every-day practice gets ONE slot rather than seven: seven identical
 * lists is a chore nobody fills in, and "every day" already says the same
 * thing happens each time.
 */
export function slotsFor(practice: { presetKey: string; days: number[] }): PlanSlot[] {
  const rotation = SPLIT_ROTATIONS[practice.presetKey]
  if (rotation && rotation.length > 1) {
    return rotation.map(name => ({ key: name.toLowerCase().replace(/\s+/g, '_'), label: name }))
  }
  if (practice.days.length === 0 || practice.days.length === 7) {
    return [{ key: 'any', label: 'Every day' }]
  }
  return [...practice.days].sort().map(d => ({ key: DAY_KEYS[d], label: DAY_LABELS[d] }))
}

/**
 * Which slot is today's, or null when nothing is due.
 *
 * A rotation advances on sessions KEPT, so missing Monday's push leaves
 * Wednesday still on push — see cues.ts for why.
 */
export function slotForToday(
  practice: { presetKey: string; days: number[] },
  today: string,
  sessionsKept: number,
): PlanSlot | null {
  const slots = slotsFor(practice)
  const rotation = SPLIT_ROTATIONS[practice.presetKey]
  if (rotation && rotation.length > 1) {
    return slots[Math.max(0, Math.floor(sessionsKept)) % slots.length] ?? null
  }
  if (slots.length === 1 && slots[0].key === 'any') return slots[0]
  const key = DAY_KEYS[weekdayOf(today)]
  return slots.find(s => s.key === key) ?? null
}

/** The lines for a slot, or an empty list. */
export function planFor(plan: PracticePlan | null | undefined, slot: PlanSlot | null): string[] {
  if (!plan || !slot) return []
  return plan[slot.key] ?? []
}

/** Does this practice have anything written down at all? */
export function hasPlan(plan: PracticePlan | null | undefined): boolean {
  if (!plan) return false
  return Object.values(plan).some(items => items.length > 0)
}

/**
 * Clean what the client sent.
 *
 * Unknown slots are dropped, blank lines disappear, and both the number of
 * lines and their length are capped — a plan is a reminder, not a document.
 * Never rejects the whole plan over one bad line: the rest is still theirs.
 */
export function cleanPlan(
  raw: unknown,
  practice: { presetKey: string; days: number[] },
): PracticePlan {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const allowed = new Set(slotsFor(practice).map(s => s.key))
  const out: PracticePlan = {}

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(key)) continue
    const items = (Array.isArray(value) ? value : [])
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim().replace(/\s+/g, ' ').slice(0, PLAN_MAX_ITEM_LENGTH))
      .filter(item => item.length > 0)
      .slice(0, PLAN_MAX_ITEMS)
    if (items.length > 0) out[key] = items
  }
  return out
}

/** Parse a stored JSON value back into a plan, ignoring anything odd. */
export function parsePlan(value: unknown): PracticePlan | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out: PracticePlan = {}
  for (const [key, items] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(items)) continue
    const lines = items.filter((i): i is string => typeof i === 'string')
    if (lines.length > 0) out[key] = lines
  }
  return Object.keys(out).length > 0 ? out : null
}

/** "Mon, Wed, Fri" for a practice, for the editor's subtitle. */
export function scheduleLabel(practice: PracticeLite): string {
  return daysLabel(practice.days)
}

/**
 * What the plan IS differs by domain, so the editor has to ask for the right
 * thing. A training day is a list of exercises; a run is one goal ("4 miles
 * in an hour"); reading is a book. Asking "what exercises?" about a book
 * would be the app not knowing what it's looking at.
 */
export interface PlanCopy {
  /** The question above the boxes. */
  ask: string
  /** One line under it. */
  hint: string
  /** Shown in an empty box — a real example, not lorem. */
  placeholder: string
  /** What one line is, for "add another" and for the row on /training. */
  noun: string
  /** Most domains are one line; training is a list. */
  multiline: boolean
}

export const PLAN_COPY: Record<string, PlanCopy> = {
  gym: {
    ask: 'What do you do that day?',
    hint: 'Your own session. One exercise per line.',
    placeholder: 'Lat pulldown\nSquat\nDumbbell press',
    noun: 'exercise',
    multiline: true,
  },
  run: {
    ask: 'What’s the run?',
    hint: 'A distance, a time, a route — whatever you’re aiming at.',
    placeholder: '4 miles in an hour',
    noun: 'goal',
    multiline: false,
  },
  read: {
    ask: 'What are you reading?',
    hint: 'The book you’re on. Change it when you finish one.',
    placeholder: 'Rich Dad Poor Dad',
    noun: 'book',
    multiline: false,
  },
  study: {
    ask: 'What are you studying?',
    hint: 'The subject, chapter or paper you’re working through.',
    placeholder: 'Chapter 4 problem set',
    noun: 'subject',
    multiline: true,
  },
  work: {
    ask: 'What’s the work?',
    hint: 'The thing this time is for.',
    placeholder: 'Ship the landing page',
    noun: 'task',
    multiline: true,
  },
  mind: {
    ask: 'What are you practising?',
    hint: 'Voxu has sessions for this — or name your own.',
    placeholder: 'Box breathing, 5 minutes',
    noun: 'practice',
    multiline: false,
  },
  custom: {
    ask: 'What does it involve?',
    hint: 'Whatever you need to see on the day.',
    placeholder: 'Scales for 10 minutes',
    noun: 'item',
    multiline: true,
  },
}

export function planCopy(domain: string | undefined): PlanCopy {
  return PLAN_COPY[domain ?? 'custom'] ?? PLAN_COPY.custom
}
