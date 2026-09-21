/**
 * Referral / affiliate links: voxu.app/i/<code>
 *
 * Deliberately separate from EraReferral, which credits a friend whose era
 * card you joined from. This is the channel Francis hands out — a creator, a
 * bio link, a partner — and a bonus may be paid on it, so the counting has
 * to be the kind you can argue with someone about:
 *
 *   - clicks are anonymous (nobody is signed in yet) and counted per hit;
 *   - a SIGNUP is one row per user per code, so a reinstall, a refresh or a
 *     second device cannot inflate a payout;
 *   - turning a code off stops attribution and keeps the numbers it earned.
 */

export const REFERRAL_BASE = 'https://voxu.app/i'

/** The cookie that carries the code from the landing page to signup. */
export const REFERRAL_COOKIE = 'voxu_ref'
/** Long enough to survive "I'll download it later", short enough to be honest. */
export const REFERRAL_COOKIE_DAYS = 30

export const CODE_MIN = 2
export const CODE_MAX = 24

/**
 * Codes live in a URL and get typed by hand off a video, so: lower case,
 * letters, digits and dashes only. Returns null for anything else rather
 * than silently "fixing" it into a different code than the one someone was
 * given.
 */
export function normalizeCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toLowerCase()
  if (code.length < CODE_MIN || code.length > CODE_MAX) return null
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(code)) return null
  // Reserved: these would collide with real paths or read as system links.
  if (['api', 'admin', 'login', 'signup', 'settings', 'era', 'join', 'i'].includes(code)) return null
  return code
}

/** A code suggested from a label — "TikTok bio" → "tiktok-bio". */
export function codeFromLabel(label: string): string | null {
  return normalizeCode(
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, CODE_MAX),
  )
}

export function referralUrl(code: string): string {
  return `${REFERRAL_BASE}/${code}`
}

export interface ReferralStat {
  code: string
  label: string
  active: boolean
  /**
   * Taps on the link. The closest thing to a "download" we can honestly
   * count: Apple does not tell an app about its own installs, so nobody can
   * report downloads per link — only the tap that preceded one.
   */
  clicks: number
  /** Accounts that arrived on this link. One per person, ever. */
  signups: number
  /** Of those, how many started an era — became a user, not just an account. */
  eras: number
  /** Of those, how many went premium. This is the column a bonus is paid on. */
  pro: number
  /** signups / clicks as a percentage, or null with no clicks to divide by. */
  conversion: number | null
  /** pro / signups — the quality of a channel, not just its volume. */
  proRate: number | null
  url: string
  createdAt: string
}

/** No clicks, no conversion rate — an empty ratio is not a zero. */
export function conversionOf(signups: number, clicks: number): number | null {
  if (clicks <= 0) return null
  return Math.round((signups / clicks) * 1000) / 10
}
