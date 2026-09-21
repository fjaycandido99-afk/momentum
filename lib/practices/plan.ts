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
/** "3 x 8 at 60kg" is a note, not a paragraph. */
export const PLAN_MAX_DETAIL_LENGTH = 40

/** A plan is slot key → the lines for that slot. */
/**
 * One row of a day: what it is, and optionally how much.
 *
 * `detail` is free text the user types ("3 x 8", "20 pages", "easy pace").
 * Voxu stores and shows it and NEVER parses it — the moment the app reads
 * "3 x 8" as data it is a workout tracker with an opinion about your
 * programme, which is the line we are not crossing.
 */
export interface PlanItem {
  name: string
  detail?: string
}

/** What one slot holds: its rows, and its own floor if it has one. */
export interface PlanSlotContent {
  items: PlanItem[]
  /**
   * The minimum for THIS day, overriding the practice's own ("first two
   * exercises", "20 minutes counts"). A Friday after a long week is not
   * the same ask as a Monday, and one global floor could not say that.
   */
  minimum?: string
}

export type PracticePlan = Record<string, PlanSlotContent>

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
export function planFor(
  plan: PracticePlan | null | undefined,
  slot: PlanSlot | null,
): PlanSlotContent | null {
  if (!plan || !slot) return null
  return plan[slot.key] ?? null
}

/** Does this practice have anything written down at all? */
export function hasPlan(plan: PracticePlan | null | undefined): boolean {
  if (!plan) return false
  return Object.values(plan).some(slot => slot.items.length > 0)
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
    const content = readSlot(value)
    if (content) out[key] = content
  }
  return out
}

/** A single field, trimmed and capped. */
function text(value: unknown, max = PLAN_MAX_ITEM_LENGTH): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''
}

/**
 * One slot, from any shape we have ever stored or been sent:
 *  - ["Squat", "Bench"]                       (the first version)
 *  - [{ name: 'Squat', detail: '3 x 8' }]     (rows)
 *  - { items: [...], minimum: '20 minutes' }  (rows with their own floor)
 *
 * Returns null for a slot with nothing in it, so empty slots never take up
 * space in storage.
 */
function readSlot(value: unknown): PlanSlotContent | null {
  const raw = Array.isArray(value)
    ? { items: value }
    : (value && typeof value === 'object' ? value as { items?: unknown; minimum?: unknown } : null)
  if (!raw) return null

  const items: PlanItem[] = (Array.isArray(raw.items) ? raw.items : [])
    .map(item => {
      // A bare string is the old format, and still what the simpler
      // domains send: a book title has no "detail".
      if (typeof item === 'string') return { name: text(item) }
      if (item && typeof item === 'object') {
        const row = item as { name?: unknown; detail?: unknown }
        const detail = text(row.detail, PLAN_MAX_DETAIL_LENGTH)
        return detail ? { name: text(row.name), detail } : { name: text(row.name) }
      }
      return { name: '' }
    })
    .filter(item => item.name.length > 0)
    .slice(0, PLAN_MAX_ITEMS)

  const minimum = text(raw.minimum, PLAN_MAX_ITEM_LENGTH)
  if (items.length === 0 && !minimum) return null
  return minimum ? { items, minimum } : { items }
}

/** Parse a stored JSON value back into a plan, ignoring anything odd. */
export function parsePlan(value: unknown): PracticePlan | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out: PracticePlan = {}
  for (const [key, slot] of Object.entries(value as Record<string, unknown>)) {
    const content = readSlot(slot)
    if (content) out[key] = content
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
  /** The question above the rows. */
  ask: string
  /** One line under it. */
  hint: string
  /** Shown in an empty box — a real example, not lorem. */
  placeholder: string
  /** What one line is, for "add another" and for the row on /training. */
  noun: string
  /** Most domains are one line; training is a list. */
  multiline: boolean
  /** Placeholder for a row's name. */
  rowPlaceholder: string
  /**
   * Whether the "how much" field appears at all. A gym set needs one; a
   * book title does not, and an empty box beside a book is a question the
   * screen is asking for no reason.
   */
  showsDetail: boolean
  /** Placeholder for that field. */
  detailPlaceholder: string
}

export const PLAN_COPY: Record<string, PlanCopy> = {
  gym: {
    ask: 'What do you do that day?',
    hint: 'Your own session. One exercise per line.',
    placeholder: 'Lat pulldown\nSquat\nDumbbell press',
    noun: 'exercise',
    multiline: true,
    rowPlaceholder: 'Squat',
    showsDetail: true,
    detailPlaceholder: '3 x 8',
  },
  run: {
    ask: 'What’s the run?',
    hint: 'A distance, a time, a route — whatever you’re aiming at.',
    placeholder: '4 miles in an hour',
    noun: 'goal',
    multiline: false,
    rowPlaceholder: 'Easy run',
    showsDetail: true,
    detailPlaceholder: '4 miles',
  },
  read: {
    ask: 'What are you reading?',
    hint: 'The book you’re on. Change it when you finish one.',
    placeholder: 'Rich Dad Poor Dad',
    noun: 'book',
    multiline: false,
    rowPlaceholder: 'Rich Dad Poor Dad',
    showsDetail: true,
    detailPlaceholder: '20 pages',
  },
  study: {
    ask: 'What are you studying?',
    hint: 'The subject, chapter or paper you’re working through.',
    placeholder: 'Chapter 4 problem set',
    noun: 'subject',
    multiline: true,
    rowPlaceholder: 'Chapter 4 problem set',
    showsDetail: true,
    detailPlaceholder: '45 min',
  },
  work: {
    ask: 'What’s the work?',
    hint: 'The thing this time is for.',
    placeholder: 'Ship the landing page',
    noun: 'task',
    multiline: true,
    rowPlaceholder: 'Ship the landing page',
    showsDetail: true,
    detailPlaceholder: '45 min',
  },
  mind: {
    ask: 'What are you practising?',
    hint: 'Voxu has sessions for this — or name your own.',
    placeholder: 'Box breathing, 5 minutes',
    noun: 'practice',
    multiline: false,
    rowPlaceholder: 'Box breathing',
    showsDetail: true,
    detailPlaceholder: '5 min',
  },
  custom: {
    ask: 'What does it involve?',
    hint: 'Whatever you need to see on the day.',
    placeholder: 'Scales for 10 minutes',
    noun: 'item',
    multiline: true,
    rowPlaceholder: 'Scales',
    showsDetail: true,
    detailPlaceholder: '10 min',
  },
}

export function planCopy(domain: string | undefined): PlanCopy {
  return PLAN_COPY[domain ?? 'custom'] ?? PLAN_COPY.custom
}
