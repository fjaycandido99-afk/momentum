import { describe, it, expect } from 'vitest'
import { eraCloseScript } from '@/lib/era/close'

const base = { eraName: 'Locked In era', lengthDays: 30, kept: 24, answered: 28, outcome: 'strong' as const, stayed: [] as string[] }

describe('the spoken era close', () => {
  it('says the real counts', () => {
    const s = eraCloseScript(base)
    expect(s).toContain('30 days of your Locked In era are finished.')
    expect(s).toContain('You kept 24 of 28 promises.')
  })

  it('names what they carried forward, in their words', () => {
    expect(eraCloseScript({ ...base, stayed: ['Read 10 pages'] })).toMatch(/carry forward Read 10 pages\. The era ends here\. That doesn’t\.$/)
    expect(eraCloseScript({ ...base, stayed: ['Read', 'Gym'] })).toMatch(/Read and Gym\. The era ends here\. Those don’t\.$/)
  })

  it('never celebrates a month that went badly', () => {
    const s = eraCloseScript({ ...base, kept: 3, answered: 25, outcome: 'poor' })
    expect(s).not.toMatch(/!|crushed|amazing|proud|again and again/i)
    expect(s).toContain('didn’t go the way you planned')
  })

  it('is the same words every time, so the voice is generated once', () => {
    expect(eraCloseScript(base)).toBe(eraCloseScript({ ...base }))
  })

  it('fits the voice cap', () => {
    const long = eraCloseScript({ ...base, stayed: ['x'.repeat(40), 'y'.repeat(40), 'z'.repeat(40)] })
    expect(long.length).toBeLessThan(600)
  })
})
