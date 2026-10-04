/**
 * Voxu Premium's list prices — the ONE place they live for anything that
 * prints a price (pricing page, download page, Settings, the upgrade screen's
 * fallback). In the app, the upgrade screen shows Apple's own price string
 * for the person's country instead (lib/revenuecat getProducts) and only
 * falls back to these.
 *
 * The change to $9.99 / $79.99 is scheduled in App Store Connect for
 * PRICE_CHANGE_DAY; the copy switches on the same local day, so it never
 * shows a price Apple isn't charging yet.
 */
export const PRICE_CHANGE_DAY = '2026-10-05'

const BEFORE = { monthly: 6.99, yearly: 49.99 } as const
const AFTER = { monthly: 9.99, yearly: 79.99 } as const

export interface ListPrices {
  monthly: number
  yearly: number
  /** Yearly, per month: "6.67". */
  yearlyPerMonth: string
  /** Yearly against 12 × monthly, whole percent: 33. */
  yearlySave: number
}

function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function listPrices(now: Date = new Date()): ListPrices {
  const p = localDay(now) >= PRICE_CHANGE_DAY ? AFTER : BEFORE
  return {
    monthly: p.monthly,
    yearly: p.yearly,
    yearlyPerMonth: (p.yearly / 12).toFixed(2),
    yearlySave: Math.round((1 - p.yearly / (p.monthly * 12)) * 100),
  }
}

/** "$9.99" */
export const usd = (n: number) => `$${n.toFixed(2)}`
