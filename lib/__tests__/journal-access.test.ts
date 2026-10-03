import { describe, it, expect } from 'vitest'
import { FREE_TIER_LIMITS, journalHistoryDays } from '@/lib/subscription-constants'
import { readFileSync } from 'fs'

describe('journal history window', () => {
  it('lets free users read ALL their own writing', () => {
    // History was once a hard false (a padlock over your own diary), then
    // seven days. Now every entry, at every tier (Francis, 2026-10-03):
    // their words are their record. Premium sells what Voxu does with them
    // — AI_MEMORY_DEPTH and unlimited reflections — never the access.
    expect(FREE_TIER_LIMITS.journal_history_enabled).toBe(true)
    expect(journalHistoryDays(false)).toBeNull()
  })

  it('gives premium the full archive', () => {
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
