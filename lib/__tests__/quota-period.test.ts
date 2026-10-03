import { describe, it, expect } from 'vitest'
import { periodKeyFor, quotaPeriod } from '@/lib/ai/quota'

describe('weekly free allowance', () => {
  // Thu 2026-10-01, 20:00 in Honolulu = Fri 06:00 UTC.
  const now = new Date('2026-10-02T06:00:00Z')

  it('keys free conversations to the local Monday, suffixed', () => {
    expect(periodKeyFor('chat', false, 'Pacific/Honolulu', now)).toBe('2026-09-28/w')
    expect(periodKeyFor('chat_voice', false, 'Pacific/Honolulu', now)).toBe('2026-09-28/w')
    expect(quotaPeriod('chat', false)).toBe('week')
  })

  it('a Sunday belongs to the week that started the Monday before', () => {
    expect(periodKeyFor('chat', false, 'UTC', new Date('2026-10-04T12:00:00Z'))).toBe('2026-09-28/w')
    expect(periodKeyFor('chat', false, 'UTC', new Date('2026-10-05T00:30:00Z'))).toBe('2026-10-05/w')
  })

  it('premium and other features stay daily', () => {
    expect(periodKeyFor('chat_voice', true, 'Pacific/Honolulu', now)).toBe('2026-10-01')
    expect(periodKeyFor('explain_voice', false, 'Pacific/Honolulu', now)).toBe('2026-10-01')
    expect(quotaPeriod('chat_voice', true)).toBe('day')
  })

  it('still sorts by date for the cleanup cron', () => {
    expect('2026-09-28/w' < '2026-09-29').toBe(true)
    expect('2026-09-28/w' > '2026-09-28').toBe(true)
  })
})
