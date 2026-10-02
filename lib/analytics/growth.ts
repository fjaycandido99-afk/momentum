/**
 * Growth & patterns — the founder's view of Voxu as a whole.
 *
 * Aggregates only. Nothing here is per person: every function takes rows
 * already stripped to ids, days, booleans and categories (the loader never
 * selects a text column), and returns counts and rates over everyone. A
 * line that would rest on fewer than MIN_PEOPLE people returns null — at
 * Voxu's size, "1 of 1 people" IS a person.
 *
 * Every rate carries its counts. Correlations are labelled as such: "used
 * by more of the people who stayed" never means "made them stay".
 *
 * Pure.
 */

/** Fewer people than this behind a line, and the line is not shown. */
export const MIN_PEOPLE = 5

export interface Rate {
  hits: number
  of: number
  /** Percent, one decimal; 0 when `of` is 0. */
  rate: number
}

export const rate = (hits: number, of: number): Rate => ({
  hits, of, rate: of === 0 ? 0 : Math.round((hits / of) * 1000) / 10,
})

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ─── Retention ───────────────────────────────────────────────────────────────

export interface UserDays {
  id: string
  /** The day they joined (YYYY-MM-DD). */
  joined: string
  /** Every day they did something on the record. */
  active: Set<string>
}

/**
 * Day-N retention: of everyone who joined at least N days ago, how many did
 * something on day N or later. ("Came back", not "came back exactly on N".)
 */
export function retention(users: readonly UserDays[], today: string, ns = [1, 7, 30]): { day: number; result: Rate | null }[] {
  return ns.map(n => {
    const eligible = users.filter(u => addDays(u.joined, n) <= today)
    if (eligible.length < MIN_PEOPLE) return { day: n, result: null }
    const back = eligible.filter(u => [...u.active].some(d => d >= addDays(u.joined, n)))
    return { day: n, result: rate(back.length, eligible.length) }
  })
}

// ─── Eras ────────────────────────────────────────────────────────────────────

export interface EraRow {
  userId: string
  startDay: string
  lengthDays: number
  /** The last day it covered: its planned end, or the day it was stopped. */
  endDay: string
  /** Over (ended, or past its last day). */
  over: boolean
  /** Era day numbers with a promise. */
  promiseDays: number[]
}

/** Lived to the end: ran its full length with 20+ promises (achievements' bar). */
export const ERA_COMPLETE_MIN_PROMISES = 20

export function eraInsights(eras: readonly EraRow[]) {
  const over = eras.filter(e => e.over)
  const completed = over.filter(e =>
    e.endDay >= addDays(e.startDay, e.lengthDays - 1) && e.promiseDays.length >= ERA_COMPLETE_MIN_PROMISES)
  const completedIds = new Set(completed.map(e => `${e.userId}|${e.startDay}`))
  const notCompleted = over.filter(e => !completedIds.has(`${e.userId}|${e.startDay}`))

  // The week of the last promise in an era that didn't make it.
  const dropWeeks = [1, 2, 3, 4].map(w => ({
    week: w,
    count: notCompleted.filter(e => {
      const last = e.promiseDays.length ? Math.max(...e.promiseDays) : 0
      return Math.min(4, Math.max(1, Math.ceil(last / 7))) === w
    }).length,
  }))

  // Of people who completed an era, how many started another after it.
  const finishers = new Set(completed.map(e => e.userId))
  const again = [...finishers].filter(u => {
    const firstDone = completed.filter(e => e.userId === u).map(e => e.endDay).sort()[0]
    return eras.some(e => e.userId === u && e.startDay > firstDone)
  })

  const people = new Set(over.map(e => e.userId)).size
  return {
    people,
    completion: people >= MIN_PEOPLE ? rate(completed.length, over.length) : null,
    dropWeeks: people >= MIN_PEOPLE ? dropWeeks : null,
    secondEra: finishers.size >= MIN_PEOPLE ? rate(again.length, finishers.size) : null,
  }
}

// ─── Disciplines ─────────────────────────────────────────────────────────────

export interface DisciplineRow {
  userId: string
  createdDay: string
  /** Days it was logged as kept (done or minimum). */
  keptDays: string[]
}

/** Of disciplines at least 4 weeks old: still kept in the last 2 weeks? */
export function disciplineSurvival(rows: readonly DisciplineRow[], today: string) {
  const old = rows.filter(r => addDays(r.createdDay, 28) <= today)
  const people = new Set(old.map(r => r.userId)).size
  if (people < MIN_PEOPLE) return { people, alive: null }
  const since = addDays(today, -14)
  const alive = old.filter(r => r.keptDays.some(d => d >= since))
  return { people, alive: rate(alive.length, old.length) }
}

// ─── What people did before they stayed ──────────────────────────────────────

export interface EarlyUser {
  id: string
  /** Features used in their first 3 days. */
  early: Set<string>
  /** Did something on day 7 or later. */
  stayed: boolean
}

/**
 * For each feature: the share of people who STAYED that used it early,
 * against the share of people who LEFT. A correlation — it does not say the
 * feature made anyone stay. Both groups need MIN_PEOPLE.
 */
export function featureBeforeRetention(users: readonly EarlyUser[], features: readonly string[]) {
  const stayed = users.filter(u => u.stayed)
  const left = users.filter(u => !u.stayed)
  if (stayed.length < MIN_PEOPLE || left.length < MIN_PEOPLE) return null
  return features
    .map(f => ({
      feature: f,
      stayed: rate(stayed.filter(u => u.early.has(f)).length, stayed.length),
      left: rate(left.filter(u => u.early.has(f)).length, left.length),
    }))
    .sort((a, b) => (b.stayed.rate - b.left.rate) - (a.stayed.rate - a.left.rate))
}

// ─── Notifications ───────────────────────────────────────────────────────────

/** Open rate per notification type, and by the local hour it was sent. */
export function notificationOpens(
  sends: readonly { userId: string; type: string; hour: number }[],
  opens: readonly { userId: string; type: string }[],
) {
  const types = [...new Set(sends.map(s => s.type))]
  const byType = types
    .map(t => {
      const s = sends.filter(x => x.type === t)
      const o = opens.filter(x => x.type === t)
      const people = new Set(s.map(x => x.userId)).size
      return { type: t, people, result: people >= MIN_PEOPLE ? rate(Math.min(o.length, s.length), s.length) : null }
    })
    .sort((a, b) => (b.result?.of ?? 0) - (a.result?.of ?? 0))
  const buckets = [
    { label: 'Before 9 AM', test: (h: number) => h < 9 },
    { label: '9 AM – noon', test: (h: number) => h >= 9 && h < 12 },
    { label: 'Noon – 6 PM', test: (h: number) => h >= 12 && h < 18 },
    { label: 'After 6 PM', test: (h: number) => h >= 18 },
  ]
  // Opens carry no send time, so the hour view is sends per bucket only —
  // where the pushes go out — not a per-hour open rate we can't measure.
  const sentByHour = buckets.map(b => {
    const s = sends.filter(x => b.test(x.hour))
    return { label: b.label, sent: s.length, people: new Set(s.map(x => x.userId)).size }
  })
  return { byType, sentByHour }
}

// ─── The patterns, across everyone ───────────────────────────────────────────

export interface PromiseFact {
  userId: string
  day: string
  /** Local hour it was made. */
  hour: number
  kept: boolean
}

export interface PatternLine {
  label: string
  result: Rate
  people: number
}

function line(label: string, rows: readonly { userId: string; kept: boolean }[]): PatternLine | null {
  const people = new Set(rows.map(r => r.userId)).size
  if (people < MIN_PEOPLE) return null
  return { label, result: rate(rows.filter(r => r.kept).length, rows.length), people }
}

/** Promises kept, by when in the day they were made. */
export function promiseTiming(promises: readonly PromiseFact[]): PatternLine[] {
  return [
    line('Made before 9 AM', promises.filter(p => p.hour < 9)),
    line('9 AM – noon', promises.filter(p => p.hour >= 9 && p.hour < 12)),
    line('Noon – 6 PM', promises.filter(p => p.hour >= 12 && p.hour < 18)),
    line('After 6 PM', promises.filter(p => p.hour >= 18)),
  ].filter((x): x is PatternLine => x !== null)
}

/** Promises kept on days the same person finished a guided session, vs not. */
export function guidedDays(promises: readonly PromiseFact[], guided: ReadonlySet<string>): PatternLine[] {
  const key = (p: PromiseFact) => `${p.userId}|${p.day}`
  return [
    line('Days with a finished guided session', promises.filter(p => guided.has(key(p)))),
    line('Days without', promises.filter(p => !guided.has(key(p)))),
  ].filter((x): x is PatternLine => x !== null)
}

/** Discipline answers kept, by the discipline's TYPE — never its name. */
export function disciplineTypes(logs: readonly { userId: string; domain: string; kept: boolean }[]): PatternLine[] {
  const domains = [...new Set(logs.map(l => l.domain))]
  return domains
    .map(d => line(d, logs.filter(l => l.domain === d)))
    .filter((x): x is PatternLine => x !== null)
    .sort((a, b) => b.result.rate - a.result.rate)
}
