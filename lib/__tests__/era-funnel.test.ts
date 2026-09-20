import { describe, expect, it } from 'vitest'
import { eraKeyRows, funnelRows, keptRate, rateLabel } from '../analytics/era-funnel'

describe('funnelRows', () => {
  it('reads conversion against the top and the step above', () => {
    const rows = funnelRows([
      { key: 'saw', label: 'Saw the picker', value: 100 },
      { key: 'started', label: 'Started an era', value: 40 },
      { key: 'promised', label: 'Made day 1', value: 30 },
    ])
    expect(rows[0]).toMatchObject({ ofTop: null, ofPrev: null, anomaly: false })
    expect(rows[1]).toMatchObject({ ofTop: 40, ofPrev: 40 })
    expect(rows[2]).toMatchObject({ ofTop: 30, ofPrev: 75 })
  })

  it('says nothing rather than 0% when there is nothing to divide by', () => {
    // Voxu's real numbers the day this shipped: nobody has started an era.
    const rows = funnelRows([
      { key: 'saw', label: 'Saw the picker', value: 0 },
      { key: 'started', label: 'Started an era', value: 0 },
    ])
    expect(rows[1].ofTop).toBeNull()
    expect(rows[1].ofPrev).toBeNull()
    expect(rows[1].anomaly).toBe(false)
  })

  it('flags a step that outruns the one above instead of reading as >100%', () => {
    // Join-link visits are counted as visits, and strangers visit without signing in.
    const rows = funnelRows([
      { key: 'started', label: 'Started an era', value: 2 },
      { key: 'visits', label: 'Join link visits', value: 9, events: true },
    ])
    expect(rows[1].anomaly).toBe(true)
    expect(rows[1].ofPrev).toBe(450)
  })

  it('keeps one decimal, not a fake-precise number', () => {
    const rows = funnelRows([
      { key: 'a', label: 'A', value: 3 },
      { key: 'b', label: 'B', value: 1 },
    ])
    expect(rows[1].ofTop).toBe(33.3)
  })
})

describe('rates', () => {
  it('has no rate before anything is answered', () => {
    expect(keptRate(0, 0)).toBeNull()
    expect(rateLabel(0, 0)).toBe('0 of 0')
    expect(keptRate(7, 10)).toBe(70)
    expect(rateLabel(7, 10)).toBe('7 of 10 (70%)')
  })
})

describe('eraKeyRows', () => {
  it('orders by starts, ties alphabetical, and rates only what it can', () => {
    const rows = eraKeyRows([
      { key: 'study', starts: 2, promises: 9, kept: 4, answered: 5 },
      { key: 'discipline', starts: 2, promises: 3, kept: 0, answered: 0 },
      { key: 'locked_in', starts: 5, promises: 20, kept: 15, answered: 18 },
    ])
    expect(rows.map(r => r.key)).toEqual(['locked_in', 'discipline', 'study'])
    expect(rows[1].keptPercent).toBeNull()
    expect(rows[0]).toMatchObject({ keptPercent: 83.3, promisesPerEra: 4 })
  })

  it('has no per-era average without a single start', () => {
    expect(eraKeyRows([{ key: 'study', starts: 0, promises: 0, kept: 0, answered: 0 }])[0].promisesPerEra).toBeNull()
  })
})
