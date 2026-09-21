import { describe, it, expect, beforeEach } from 'vitest'
import {
  FOREVER,
  clearDismissed,
  hiddenByValue,
  isDismissed,
  localDayKey,
  setDismissed,
  sweepDismissals,
  valueFor,
} from '@/lib/ui/dismiss'

describe('localDayKey', () => {
  it('uses the local date, not UTC', () => {
    // 1 January, 00:30 local. toISOString() would say 31 December in any
    // timezone ahead of UTC — which is how a "once a day" card came back
    // twice in one evening.
    const local = new Date(2026, 0, 1, 0, 30)
    expect(localDayKey(local)).toBe('2026-01-01')
  })

  it('pads months and days', () => {
    expect(localDayKey(new Date(2026, 8, 5, 12))).toBe('2026-09-05')
  })
})

describe('hiddenByValue', () => {
  it('hides for ever when asked to', () => {
    expect(hiddenByValue(FOREVER, '2026-09-20')).toBe(true)
  })

  it('hides only on the day it was dismissed', () => {
    expect(hiddenByValue('2026-09-20', '2026-09-20')).toBe(true)
    expect(hiddenByValue('2026-09-20', '2026-09-21')).toBe(false)
  })

  it('shows the card when there is nothing stored', () => {
    expect(hiddenByValue(null, '2026-09-20')).toBe(false)
    expect(hiddenByValue('', '2026-09-20')).toBe(false)
  })

  it('shows the card for a value it does not understand', () => {
    // A corrupt value must never hide something for ever.
    expect(hiddenByValue('true', '2026-09-20')).toBe(false)
    expect(hiddenByValue('{}', '2026-09-20')).toBe(false)
  })
})

describe('valueFor', () => {
  it('stores the day for a one-day dismissal', () => {
    expect(valueFor('today', '2026-09-20')).toBe('2026-09-20')
    expect(valueFor('forever', '2026-09-20')).toBe(FOREVER)
  })
})

describe('with storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('remembers a dismissal', () => {
    expect(isDismissed('card')).toBe(false)
    setDismissed('card')
    expect(isDismissed('card')).toBe(true)
  })

  it('forgets a day-scoped dismissal tomorrow', () => {
    const today = new Date(2026, 8, 20, 9)
    const tomorrow = new Date(2026, 8, 21, 9)
    setDismissed('quote', 'today', today)
    expect(isDismissed('quote', today)).toBe(true)
    expect(isDismissed('quote', tomorrow)).toBe(false)
  })

  it('can be undone', () => {
    setDismissed('card')
    clearDismissed('card')
    expect(isDismissed('card')).toBe(false)
  })

  it('sweeps yesterday’s keys but keeps today’s and the permanent ones', () => {
    const today = new Date(2026, 8, 20, 9)
    setDismissed('old', 'today', new Date(2026, 8, 18, 9))
    setDismissed('recent', 'today', today)
    setDismissed('gone', 'forever', today)
    localStorage.setItem('voxu_mindset', 'stoic') // not ours; must survive

    sweepDismissals(today)

    expect(isDismissed('old', today)).toBe(false)
    expect(isDismissed('recent', today)).toBe(true)
    expect(isDismissed('gone', today)).toBe(true)
    expect(localStorage.getItem('voxu_mindset')).toBe('stoic')
  })
})
