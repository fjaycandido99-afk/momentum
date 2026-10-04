/**
 * Measurable promises and their receipts — pure.
 *
 * A promise may carry what it counts toward ("Gym", "Reading") and,
 * optionally, how much ("20 pages"). Receipts total only KEPT promises —
 * "Gym ×18", "Reading — 240 pages" — from what they said they'd do and
 * then did. Never parsed out of the promise's words: only what they chose
 * to count, in the fields they filled.
 */

export const MEASURE_UNITS = ['minutes', 'pages', 'reps', 'km', 'sessions', 'times'] as const
export type MeasureUnit = (typeof MEASURE_UNITS)[number]

export const MEASURE_TAG_MAX = 24
export const MEASURE_AMOUNT_MAX = 10000

export interface Measure {
  tag: string
  amount: number | null
  unit: MeasureUnit | null
}

/** A clean measure, or null if there's nothing to count. Amount needs a unit and vice versa. */
export function parseMeasure(raw: unknown): Measure | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const tag = typeof r.tag === 'string' ? r.tag.replace(/\s+/g, ' ').trim().slice(0, MEASURE_TAG_MAX) : ''
  if (!tag) return null
  const n = typeof r.amount === 'number' ? r.amount : typeof r.amount === 'string' ? Number(r.amount) : NaN
  const amount = Number.isInteger(n) && n > 0 && n <= MEASURE_AMOUNT_MAX ? n : null
  const unit = typeof r.unit === 'string' && (MEASURE_UNITS as readonly string[]).includes(r.unit) ? (r.unit as MeasureUnit) : null
  return amount !== null && unit !== null ? { tag, amount, unit } : { tag, amount: null, unit: null }
}

export interface MeasuredPromise {
  tag: string | null
  amount: number | null
  unit: string | null
  kept: boolean | null
}

export interface Receipt {
  /** As they first wrote it. */
  tag: string
  /** Kept promises that counted toward it. */
  kept: number
  /** Sums by unit, largest first — "240 pages", "300 minutes". */
  totals: { unit: string; sum: number }[]
}

/** Kept promises grouped by what they count toward (case-insensitive), most kept first. */
export function receipts(promises: readonly MeasuredPromise[]): Receipt[] {
  const by = new Map<string, Receipt>()
  for (const p of promises) {
    if (p.kept !== true || !p.tag) continue
    const key = p.tag.trim().toLowerCase()
    if (!key) continue
    const r = by.get(key) ?? { tag: p.tag.trim(), kept: 0, totals: [] }
    r.kept++
    if (p.amount && p.unit) {
      const t = r.totals.find(x => x.unit === p.unit)
      if (t) t.sum += p.amount
      else r.totals.push({ unit: p.unit, sum: p.amount })
    }
    by.set(key, r)
  }
  return [...by.values()]
    .map(r => ({ ...r, totals: r.totals.sort((a, b) => b.sum - a.sum) }))
    .sort((a, b) => b.kept - a.kept || a.tag.localeCompare(b.tag))
}

/** "Gym ×18" or "Reading — 240 pages". */
export function receiptLine(r: Receipt): string {
  return r.totals.length ? `${r.tag} — ${r.totals.map(t => `${t.sum} ${t.unit}`).join(' · ')}` : `${r.tag} ×${r.kept}`
}
