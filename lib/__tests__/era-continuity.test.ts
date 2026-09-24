import { describe, it, expect } from 'vitest'
import { eraFinished, eraOrdinal } from '@/lib/era/logic'

const MIN = 20

describe('did the era finish', () => {
  const base = { startDay: '2026-08-01', lengthDays: 30, endDay: '2026-09-01', promisesMade: 28, minPromises: MIN }

  it('yes: it ran past its last day and was lived', () => {
    expect(eraFinished(base)).toBe(true)
  })

  it('no while it is still running', () => {
    expect(eraFinished({ ...base, endDay: '2026-08-20' })).toBe(false)
  })

  it('no on the last day itself — day 30 of 30 is not past it', () => {
    // 2026-08-30 is day 30. The era finishes the day AFTER its last day.
    expect(eraFinished({ ...base, endDay: '2026-08-30' })).toBe(false)
    expect(eraFinished({ ...base, endDay: '2026-08-31' })).toBe(true)
  })

  it('no for an era nobody lived', () => {
    // The condition that matters. By the calendar this ran its course, but
    // three promises in thirty days is not a finished era — and without this
    // somebody could collect completions by starting eras and ignoring them.
    expect(eraFinished({ ...base, promisesMade: 3 })).toBe(false)
    expect(eraFinished({ ...base, promisesMade: 0 })).toBe(false)
  })

  it('counts promises MADE, not kept', () => {
    // Finishing is about showing up. Somebody who answered honestly every
    // day and kept almost none still finished the era.
    expect(eraFinished({ ...base, promisesMade: MIN })).toBe(true)
  })

  it('handles a shorter era on its own length', () => {
    expect(eraFinished({ startDay: '2026-09-01', lengthDays: 7, endDay: '2026-09-09', promisesMade: 20, minPromises: MIN })).toBe(true)
    expect(eraFinished({ startDay: '2026-09-01', lengthDays: 7, endDay: '2026-09-05', promisesMade: 20, minPromises: MIN })).toBe(false)
  })
})

describe('which era this is, in words', () => {
  it('says nothing for the first one', () => {
    // "Your first era" on the day you finish your first era is a strange
    // thing to be told. The caller shows nothing instead.
    expect(eraOrdinal(1)).toBeNull()
    expect(eraOrdinal(0)).toBeNull()
    expect(eraOrdinal(-3)).toBeNull()
  })

  it('uses words up to ten', () => {
    expect(eraOrdinal(2)).toBe('second')
    expect(eraOrdinal(3)).toBe('third')
    expect(eraOrdinal(10)).toBe('tenth')
  })

  it('switches to digits past ten, where words stop reading well', () => {
    expect(eraOrdinal(11)).toBe('11th')
    expect(eraOrdinal(21)).toBe('21st')
    expect(eraOrdinal(22)).toBe('22nd')
    expect(eraOrdinal(23)).toBe('23rd')
    expect(eraOrdinal(24)).toBe('24th')
  })

  it('gets the teens right, which is where ordinal code usually breaks', () => {
    expect(eraOrdinal(12)).toBe('12th')
    expect(eraOrdinal(13)).toBe('13th')
    expect(eraOrdinal(111)).toBe('111th')
    expect(eraOrdinal(112)).toBe('112th')
    expect(eraOrdinal(113)).toBe('113th')
  })

  it('survives nonsense', () => {
    expect(eraOrdinal(2.5)).toBeNull()
    expect(eraOrdinal(NaN)).toBeNull()
  })
})
