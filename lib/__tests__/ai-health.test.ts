import { describe, it, expect } from 'vitest'
import { assessHealth, isAlerting, MIN_VOLUME, DEGRADED_RATE } from '@/lib/ai/health'

const rows = (ok: number, failed: number, error = '404 model_not_found') => [
  ...Array.from({ length: ok }, () => ({ outcome: 'ok' as const, error: null })),
  ...Array.from({ length: failed }, () => ({ outcome: 'failed' as const, error })),
]

describe('assessHealth', () => {
  it('calls a total outage DOWN — the shape the 17-day incident had', () => {
    const r = assessHealth(rows(0, 20), '90m')
    expect(r.verdict).toBe('down')
    expect(isAlerting(r.verdict)).toBe(true)
    expect(r.summary).toContain('DOWN')
    expect(r.errors[0]).toContain('model_not_found')
  })

  it('stays quiet when nobody used the AI', () => {
    // Alerting on silence would page at 3am every night.
    const r = assessHealth([], '90m')
    expect(r.verdict).toBe('idle')
    expect(isAlerting(r.verdict)).toBe(false)
  })

  it('does not cry outage over a couple of failures', () => {
    // Below MIN_VOLUME a 100% failure rate is one flaky request, not an
    // incident. A false alarm trains you to ignore the real one.
    const r = assessHealth(rows(0, MIN_VOLUME - 1), '90m')
    expect(isAlerting(r.verdict)).toBe(false)
  })

  it('flags a partial failure rate as degraded', () => {
    const r = assessHealth(rows(5, 5), '90m')
    expect(r.verdict).toBe('degraded')
    expect(r.failureRate).toBeGreaterThanOrEqual(DEGRADED_RATE)
  })

  it('treats an occasional blip as healthy', () => {
    const r = assessHealth(rows(49, 1), '90m')
    expect(r.verdict).toBe('healthy')
    expect(isAlerting(r.verdict)).toBe(false)
  })

  it('de-duplicates repeated error text so the email is readable', () => {
    const r = assessHealth(rows(0, 30), '90m')
    expect(r.errors.length).toBe(1)
  })
})
