import { describe, it, expect } from 'vitest'
import { FREE_TIER_LIMITS, journalHistoryDays } from '@/lib/subscription-constants'
import { readFileSync } from 'fs'

describe('journal history window', () => {
  it('lets free users read their own recent writing', () => {
    // The regression this guards: history used to be a hard false — a
    // padlock over your own diary, which makes the free tier write-only
    // and hides the one thing that makes journalling worth repeating.
    expect(FREE_TIER_LIMITS.journal_history_enabled).toBe(true)
    expect(journalHistoryDays(false)).toBeGreaterThan(0)
  })

  it('gives premium the full archive', () => {
    expect(journalHistoryDays(true)).toBeNull()
  })

  it('keeps the free window smaller than premium, or there is nothing to sell', () => {
    const free = journalHistoryDays(false)
    expect(free).not.toBeNull()
    expect(journalHistoryDays(true)).toBeNull()
  })
})

describe('data export', () => {
  const src = readFileSync('app/api/account/export/route.ts', 'utf8')

  it('is not gated on subscription tier', () => {
    // Export answers a GDPR Article 20 right and a promise the privacy
    // policy already makes twice. Putting it behind a paywall would mean
    // charging someone for a copy of their own words.
    expect(src).not.toContain('isPremiumUser')
    expect(src).not.toContain('aiGate')
  })

  it('scopes every query to the caller', () => {
    // No route param decides whose data this is.
    expect(src).not.toMatch(/params/)
    const queries = src.match(/where: \{[^}]*\}/g) ?? []
    expect(queries.length).toBeGreaterThan(0)
    for (const q of queries) expect(q).toMatch(/user\.id/)
  })

  it('downloads as a file rather than dumping JSON into a tab', () => {
    expect(src).toContain('Content-Disposition')
    expect(src).toContain('attachment')
  })
})
