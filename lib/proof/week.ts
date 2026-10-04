import type { ProofDetail } from './server'

/**
 * Your week — pure, counts only. The last seven days (today included)
 * against the seven before, read from the Proof record. No percentages, no
 * score, no verdict: each number is a count with its own denominator.
 *
 * "Harder days" exists ONLY when they turned wellness check-ins on and
 * logged a low mood (1–2) — otherwise the line isn't there at all.
 */
export interface WeekCounts {
  /** Days with a promise made. */
  promised: number
  kept: number
  missed: number
  practicesKept: number
  sessions: number
  missions: number
  checkIns: number
  /** Check-ins with mood 1–2. Null when they didn't check in at all. */
  harderDays: number | null
}

export interface WeekRecap {
  from: string
  to: string
  thisWeek: WeekCounts
  lastWeek: WeekCounts
  /** False when nothing at all happened in either week — show nothing. */
  hasAnything: boolean
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function count(details: Record<string, ProofDetail>, from: string, to: string): WeekCounts {
  const c: WeekCounts = { promised: 0, kept: 0, missed: 0, practicesKept: 0, sessions: 0, missions: 0, checkIns: 0, harderDays: null }
  let harder = 0
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const x = details[d]
    if (!x) continue
    if (x.promise !== null) c.promised++
    if (x.kept === true) c.kept++
    if (x.kept === false) c.missed++
    c.practicesKept += x.practices.filter(p => p.kept).length
    if (x.exercise?.completed) c.sessions++
    if (x.missionDone) c.missions++
    if (x.state) {
      c.checkIns++
      if (x.state.mood !== null && x.state.mood <= 2) harder++
    }
  }
  c.harderDays = c.checkIns > 0 ? harder : null
  return c
}

const any = (c: WeekCounts) => c.promised + c.practicesKept + c.sessions + c.missions + c.checkIns > 0

export function weekRecap(details: Record<string, ProofDetail>, today: string): WeekRecap {
  const from = addDays(today, -6)
  const thisWeek = count(details, from, today)
  const lastWeek = count(details, addDays(from, -7), addDays(from, -1))
  return { from, to: today, thisWeek, lastWeek, hasAnything: any(thisWeek) || any(lastWeek) }
}

/** The one line Home says about the week — counts, never a judgement. */
export function weekLine(r: WeekRecap): string | null {
  const t = r.thisWeek
  if (t.promised === 0) return null
  return `This week: ${t.kept} of ${t.promised} promises kept.`
}
