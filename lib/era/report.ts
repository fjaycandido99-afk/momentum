import { ERA_STAGES, type EraStageKey } from './logic'

/**
 * The end-of-era report: thirty days, counted.
 *
 * The Era Recap is the coach's letter — prose, written by the model. This is
 * the arithmetic underneath it, and the two are better together: a sentence
 * about who you became lands harder next to the number that earned it.
 *
 * Same rules as the rest of the era's numbers:
 *  - every figure carries its counts, so nothing has to be taken on trust;
 *  - a figure with too little behind it is OMITTED, not estimated;
 *  - no blended "consistency score" — a single number nobody can check is
 *    where honest reporting turns into a badge. Halves are compared
 *    instead, because "68% → 86%" is a claim you can verify by counting.
 */

export interface ReportPromise {
  /** 1-based day of the era. */
  day: number
  kept: boolean | null
  /** Fixed-list keys (lib/era/reasons.ts). */
  blocker: string | null
  helper: string | null
}

export interface ReportWellnessDay {
  day: number
  mood: number | null
  energy: number | null
}

export interface ReportInput {
  eraTitle: string
  lengthDays: number
  promises: ReportPromise[]
  /** Days whose mission was marked done. */
  missionDays: number[]
  wellness: ReportWellnessDay[]
}

export interface ReportHalves {
  label: string
  firstHalf: { kept: number; answered: number; percent: number }
  secondHalf: { kept: number; answered: number; percent: number }
  /** Points of change, first half → second. Negative is a decline. */
  change: number
}

export interface ReportLine {
  label: string
  value: string
  /** The counts behind it, always. */
  detail?: string
}

export interface EraReport {
  title: string
  lengthDays: number
  /** The headline numbers, in the order they should be read. */
  lines: ReportLine[]
  /** First half vs second half of the era, when both halves have answers. */
  halves: ReportHalves | null
  /** Which phases they actually showed up for. */
  phases: { phase: number; label: string; days: number; kept: number; answered: number }[]
  /** Omitted figures, named — so the report is honest about its own gaps. */
  missing: string[]
}

/** Enough answers on each side before a halves comparison means anything. */
export const HALVES_MIN_PER_SIDE = 4
/** Enough tagged answers before naming a most-common reason. */
export const REASON_MIN = 3
/** Enough wellness days per half before reporting a change. */
export const WELLNESS_MIN_PER_SIDE = 3

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100))

/** The longest run of consecutive days with a KEPT promise. */
export function longestKeptRun(promises: ReportPromise[]): number {
  const kept = new Set(promises.filter(p => p.kept === true).map(p => p.day))
  let best = 0
  let run = 0
  const maxDay = promises.reduce((m, p) => Math.max(m, p.day), 0)
  for (let day = 1; day <= maxDay; day++) {
    run = kept.has(day) ? run + 1 : 0
    if (run > best) best = run
  }
  return best
}

/** The most common key, with its count — or null when nothing leads. */
export function topReason(keys: (string | null)[]): { key: string; count: number; of: number } | null {
  const present = keys.filter((k): k is string => !!k)
  if (present.length < REASON_MIN) return null
  const counts = new Map<string, number>()
  for (const k of present) counts.set(k, (counts.get(k) ?? 0) + 1)
  // Ties broken by key, so the same era always reports the same reason.
  const [key, count] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return { key, count, of: present.length }
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

export function buildEraReport(
  input: ReportInput,
  /** Turns a blocker/helper key into words (lib/era/reasons reasonLabel). */
  reasonLabel: (key: string) => string = k => k,
): EraReport {
  const { promises, lengthDays, missionDays, wellness } = input
  const answered = promises.filter(p => p.kept !== null)
  const kept = answered.filter(p => p.kept === true)
  const missing: string[] = []

  const lines: ReportLine[] = [
    { label: 'Promises made', value: String(promises.length), detail: `over ${lengthDays} days` },
  ]

  if (answered.length > 0) {
    lines.push({
      label: 'Kept',
      value: `${kept.length} of ${answered.length}`,
      detail: `${pct(kept.length, answered.length)}% of the ones you answered`,
    })
  } else {
    missing.push('You never answered a promise, so there is no follow-through to report.')
  }

  if (missionDays.length > 0) {
    lines.push({ label: 'Missions done', value: String(missionDays.length), detail: `of ${lengthDays} offered` })
  }

  const run = longestKeptRun(promises)
  if (run > 0) {
    lines.push({ label: 'Longest run kept', value: `${run} ${run === 1 ? 'day' : 'days'}`, detail: 'back to back' })
  }

  const blocker = topReason(answered.filter(p => p.kept === false).map(p => p.blocker))
  if (blocker) {
    lines.push({
      label: 'What stopped you most',
      value: reasonLabel(blocker.key),
      detail: `${blocker.count} of the ${blocker.of} misses you told me about`,
    })
  } else {
    missing.push('Not enough misses were tagged to name what stopped you.')
  }

  const helper = topReason(kept.map(p => p.helper))
  if (helper) {
    lines.push({
      label: 'What helped most',
      value: reasonLabel(helper.key),
      detail: `${helper.count} of the ${helper.of} keeps you told me about`,
    })
  }

  // Energy and mood, first half against second — only with real days on both
  // sides. "3.1 → 4.2" from two days each would be noise with a decimal.
  const mid = Math.ceil(lengthDays / 2)
  for (const [label, pick] of [['Energy', 'energy'], ['Mood', 'mood']] as const) {
    const first = wellness.filter(w => w.day <= mid).map(w => w[pick]).filter((v): v is number => v !== null)
    const second = wellness.filter(w => w.day > mid).map(w => w[pick]).filter((v): v is number => v !== null)
    if (first.length >= WELLNESS_MIN_PER_SIDE && second.length >= WELLNESS_MIN_PER_SIDE) {
      const a = mean(first)!
      const b = mean(second)!
      lines.push({
        label: `${label}, start to finish`,
        value: `${a} → ${b}`,
        detail: `${first.length} days then ${second.length} days, out of 5`,
      })
    }
  }

  // Halves of the era, by kept rate. The honest version of "consistency 61 → 86".
  const firstAnswered = answered.filter(p => p.day <= mid)
  const secondAnswered = answered.filter(p => p.day > mid)
  let halves: ReportHalves | null = null
  if (firstAnswered.length >= HALVES_MIN_PER_SIDE && secondAnswered.length >= HALVES_MIN_PER_SIDE) {
    const f = { kept: firstAnswered.filter(p => p.kept).length, answered: firstAnswered.length }
    const s = { kept: secondAnswered.filter(p => p.kept).length, answered: secondAnswered.length }
    const fp = pct(f.kept, f.answered)
    const sp = pct(s.kept, s.answered)
    halves = {
      label: 'First half → second half',
      firstHalf: { ...f, percent: fp },
      secondHalf: { ...s, percent: sp },
      change: sp - fp,
    }
  } else {
    missing.push('Too few answers in one half of the era to compare the two.')
  }

  const phases = ([1, 2, 3, 4] as const).map(phase => {
    const key = (Object.keys(ERA_STAGES) as EraStageKey[]).find(k => ERA_STAGES[k].phase === phase)!
    const bounds = [0, 7 / 30, 14 / 30, 21 / 30, 1]
    const from = phase === 1 ? 1 : Math.round(bounds[phase - 1] * lengthDays) + 1
    const to = phase === 4 ? lengthDays : Math.round(bounds[phase] * lengthDays)
    const inPhase = promises.filter(p => p.day >= from && p.day <= to)
    const answeredIn = inPhase.filter(p => p.kept !== null)
    return {
      phase,
      label: ERA_STAGES[key].label,
      days: inPhase.length,
      kept: answeredIn.filter(p => p.kept === true).length,
      answered: answeredIn.length,
    }
  })

  return { title: input.eraTitle, lengthDays, lines, halves, phases, missing }
}
