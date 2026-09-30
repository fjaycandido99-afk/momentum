/**
 * Voxu Pulse — decides what matters right now, and what today holds.
 *
 * One function, fed by what the app already knows: the era's day loop, the
 * disciplines' state for today, and the routine's times. It answers two
 * questions so home (and later the widget and the one nudge per app open)
 * never has to show five equal cards and let the person pick:
 *
 *   rightNow — the ONE thing to do, with one sentence of why and one action.
 *   today    — the day as a short timeline, and "N of M" done.
 *
 * ── RULES ─────────────────────────────────────────────────────────────
 *
 * - Only facts. A ✓ appears only where something was recorded: a discipline
 *   logged, a promise kept, a mission marked, a sequence routine run. A
 *   timed routine step records nothing (lib/routines/glance.ts), so it is
 *   only ever "upcoming" — never "done", never "missed".
 * - "At risk" needs a reason that can be said out loud: the planned time is
 *   more than an hour gone, or this weekday is the one they miss most
 *   (Practice.weakDay, which only exists with enough history behind it).
 * - Never guilt. A slipping discipline is offered its minimum, not a warning.
 *
 * Pure: the clock comes in as minutes past local midnight and a weekday.
 */

export type LoopStep = 'state' | 'promise' | 'act' | 'check' | 'check_yesterday' | 'prepare' | 'ready' | 'complete'

export type PracticeState = 'due' | 'done' | 'minimum' | 'missed' | 'rest'

export interface PulseEra {
  /** advice: one line quoted from their own morning check-in, or null. */
  loop: { step: LoopStep; line: string; advice?: string | null }
  /** Today's promise text and whether it was answered. */
  today: { text: string; kept: boolean | null } | null
  mission: string | null
  missionDone: boolean
}

export interface PulsePractice {
  id: string
  label: string
  state: PracticeState
  todaysMinimum: string
  weakDay: { weekday: number; missed: number; of: number } | null
}

export interface PulseStep {
  kind: string
  ref: string | null
  label: string | null
  /** "HH:MM", local. */
  time: string | null
  weight?: 'required' | 'optional' | 'bad_day'
}

export interface PulseInput {
  /** Minutes past local midnight. */
  now: number
  /** Local weekday, 0 = Sunday. */
  weekday: number
  era: PulseEra | null
  practices: PulsePractice[]
  /** Today's timed routine steps, already filtered to a day it runs. */
  steps: PulseStep[]
}

export type ActionTarget =
  | { type: 'era' }
  | { type: 'practice'; id: string }

export interface RightNow {
  kind: 'era' | 'slipping' | 'due_now' | 'due_today' | 'mission' | 'done'
  /** A short line, said to them. */
  eyebrow: string
  title: string
  /** Their own words, when the moment is about them (the promise, mission). */
  quote: string | null
  context: string | null
  action: { label: string; target: ActionTarget } | null
}

export type TodayStatus = 'done' | 'minimum' | 'kept' | 'missed' | 'open' | 'due' | 'upcoming'

export interface TodayItem {
  key: string
  kind: 'promise' | 'mission' | 'discipline' | 'step'
  title: string
  /** "HH:MM" when the routine gives it a time. */
  time: string | null
  status: TodayStatus
  target: ActionTarget | null
}

export interface Pulse {
  rightNow: RightNow | null
  today: { items: TodayItem[]; done: number; total: number }
  /** The next timed thing still ahead today, for "Next: Gym · 5:30 PM". */
  next: { title: string; time: string } | null
}

const DAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

/** How early "due now" starts before the planned time, and how long after
 *  the planned time it stays "due now" before it is "slipping". */
export const DUE_WINDOW_BEFORE = 15
export const SLIP_AFTER = 60

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function timeLabel(time: string): string {
  const mins = minutesOf(time)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

/** The planned time for a discipline, from the routine step that points at it. */
function plannedTime(practiceId: string, steps: PulseStep[]): string | null {
  const s = steps.find(x => x.ref === practiceId && x.time && x.weight !== 'bad_day')
  return s?.time ?? null
}

interface Scored { p: PulsePractice; time: string | null; slipping: string | null; dueNow: boolean }

function scorePractices(input: PulseInput): Scored[] {
  return input.practices
    .filter(p => p.state === 'due')
    .map(p => {
      const time = plannedTime(p.id, input.steps)
      let slipping: string | null = null
      let dueNow = false
      if (time) {
        const t = minutesOf(time)
        if (input.now > t + SLIP_AFTER) slipping = `Planned for ${timeLabel(time)}.`
        else if (input.now >= t - DUE_WINDOW_BEFORE) dueNow = true
      }
      // Their hardest weekday, said before the day is spent — and only in the
      // second half of it, when there is still time to do the minimum.
      if (!slipping && p.weakDay && p.weakDay.weekday === input.weekday && input.now >= 15 * 60) {
        slipping = `${DAY_NAMES[input.weekday]} are the day this one slips.`
      }
      return { p, time, slipping, dueNow }
    })
}

function minimumContext(p: PulsePractice): string {
  return p.todaysMinimum ? `The minimum counts: ${p.todaysMinimum}.` : 'The minimum counts.'
}

export function rightNow(input: PulseInput, scored: Scored[] = scorePractices(input)): RightNow | null {
  const era = input.era
  const step = era?.loop.step ?? null

  const fromEra = (eyebrow = 'Right now'): RightNow => ({
    kind: 'era',
    eyebrow,
    title: era!.loop.line,
    quote: step === 'act' || step === 'check' ? era!.today?.text ?? null : null,
    context: era!.loop.advice ?? null,
    action: { label: step === 'check' || step === 'check_yesterday' ? 'Answer' : 'Go', target: { type: 'era' } },
  })

  // 1. The gates: an open yesterday, and the morning check-in.
  if (step === 'check_yesterday' || step === 'state') return fromEra('First')

  // 2. A discipline slipping, then one due now.
  const slip = scored.find(s => s.slipping)
  if (slip) {
    return {
      kind: 'slipping',
      eyebrow: 'Before it slips',
      title: `${slip.p.label} — do the minimum.`,
      quote: null,
      context: `${slip.slipping} ${minimumContext(slip.p)}`,
      action: { label: 'Open', target: { type: 'practice', id: slip.p.id } },
    }
  }
  const now = scored.find(s => s.dueNow)
  if (now) {
    return {
      kind: 'due_now',
      eyebrow: 'Due now',
      title: `${now.p.label} is due now.`,
      quote: null,
      context: minimumContext(now.p),
      action: { label: 'Open', target: { type: 'practice', id: now.p.id } },
    }
  }

  // 3. The promise and the evening check.
  if (step === 'promise' || step === 'check') return fromEra()

  // 4. In the day, something to actually do beats "go and do it".
  // Untimed only: a timed one still hours away is "Next", not "right now".
  const untimed = scored.find(s => !s.time)
  if (untimed && (step === null || step === 'act' || step === 'prepare' || step === 'ready' || step === 'complete')) {
    return {
      kind: 'due_today',
      eyebrow: 'Right now',
      title: `${untimed.p.label} is due today.`,
      quote: null,
      context: minimumContext(untimed.p),
      action: { label: 'Open', target: { type: 'practice', id: untimed.p.id } },
    }
  }
  if (step === 'act' || step === 'prepare') return fromEra()

  // 5. The mission, then done.
  if (era?.mission && !era.missionDone && step !== 'complete') {
    return {
      kind: 'mission',
      eyebrow: 'Today’s mission',
      title: 'One thing left: the mission.',
      quote: era.mission,
      context: null,
      action: { label: 'Go', target: { type: 'era' } },
    }
  }
  if (era) return { kind: 'done', eyebrow: 'Done for today', title: era.loop.line, quote: null, context: null, action: null }
  return null
}

export function todayItems(input: PulseInput): TodayItem[] {
  const items: TodayItem[] = []
  const era = input.era

  if (era && era.loop.step !== 'complete') {
    const t = era.today
    items.push({
      key: 'promise',
      kind: 'promise',
      title: t ? 'Today’s promise' : 'Make today’s promise',
      time: null,
      status: !t ? 'open' : t.kept === true ? 'kept' : t.kept === false ? 'missed' : 'open',
      target: { type: 'era' },
    })
  }

  for (const p of input.practices) {
    if (p.state === 'rest') continue
    const time = plannedTime(p.id, input.steps)
    const status: TodayStatus =
      p.state === 'done' ? 'done'
        : p.state === 'minimum' ? 'minimum'
        : p.state === 'missed' ? 'missed'
        : time && input.now < minutesOf(time) - DUE_WINDOW_BEFORE ? 'upcoming'
        : 'due'
    items.push({ key: `practice-${p.id}`, kind: 'discipline', title: p.label, time, status, target: { type: 'practice', id: p.id } })
  }

  if (era?.mission && era.loop.step !== 'complete') {
    items.push({
      key: 'mission',
      kind: 'mission',
      title: 'Today’s mission',
      time: null,
      status: era.missionDone ? 'done' : 'open',
      target: { type: 'era' },
    })
  }

  // Timed steps that are not a discipline, and only while still ahead: they
  // record nothing, so a past one could only be shown as a claim.
  const practiceIds = new Set(input.practices.map(p => p.id))
  for (const s of input.steps) {
    if (!s.time || s.weight === 'bad_day') continue
    if (s.ref && practiceIds.has(s.ref)) continue
    if (minutesOf(s.time) <= input.now) continue
    items.push({ key: `step-${s.time}-${s.label ?? s.kind}`, kind: 'step', title: s.label?.trim() || stepName(s.kind), time: s.time, status: 'upcoming', target: null })
  }

  // Timed first in clock order, then the untimed in the order above.
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => {
      const ta = a.it.time ? minutesOf(a.it.time) : Infinity
      const tb = b.it.time ? minutesOf(b.it.time) : Infinity
      return ta - tb || a.i - b.i
    })
    .map(x => x.it)
}

function stepName(kind: string): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1).replace(/_/g, ' ')
}

const COUNTED: TodayStatus[] = ['done', 'minimum', 'kept']

export function buildPulse(input: PulseInput): Pulse {
  const scored = scorePractices(input)
  const items = todayItems(input)
  // Only things that can be answered count toward "N of M".
  const answerable = items.filter(i => i.kind !== 'step')
  const done = answerable.filter(i => COUNTED.includes(i.status)).length
  const nextTimed = items.find(i => i.time && minutesOf(i.time) > input.now && (i.status === 'upcoming' || i.status === 'due'))
  return {
    rightNow: rightNow(input, scored),
    today: { items, done, total: answerable.length },
    next: nextTimed ? { title: nextTimed.title, time: nextTimed.time! } : null,
  }
}
