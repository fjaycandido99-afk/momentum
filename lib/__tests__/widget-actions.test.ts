import { describe, it, expect } from 'vitest'
import { checkinMood, checkinState, isWidgetAction, tomorrowSuggestion } from '@/lib/widget/actions'

describe('widget buttons', () => {
  it('knows exactly three actions', () => {
    expect(isWidgetAction('promise_done')).toBe(true)
    expect(isWidgetAction('checkin')).toBe(true)
    expect(isWidgetAction('tomorrow_keep')).toBe(true)
    expect(isWidgetAction('delete_account')).toBe(false)
  })

  it('maps Low / Okay / Good onto the 1–5 mood scale', () => {
    expect([checkinMood('low'), checkinMood('okay'), checkinMood('good')]).toEqual([2, 3, 4])
    expect(checkinMood('great')).toBeNull()
    expect(checkinMood(5)).toBeNull()
  })

  it('asks only when check-ins are on — their consent', () => {
    expect(checkinState({ on: false, checkedToday: false })).toBe('off')
    expect(checkinState({ on: true, checkedToday: false })).toBe('ask')
    expect(checkinState({ on: true, checkedToday: true })).toBe('done')
    expect(checkinState(undefined)).toBe('off')
  })

  it('suggests tomorrow from today’s own promise, and says why', () => {
    expect(tomorrowSuggestion({ text: 'Read 10 pages', kept: true }, false)).toEqual({ text: 'Read 10 pages', why: 'You kept this today' })
    expect(tomorrowSuggestion({ text: 'Read 10 pages', kept: null }, false)?.why).toBe('Today’s promise, again')
    const missed = tomorrowSuggestion({ text: "I'll work on my business for 20 minutes", kept: false }, false)
    expect(missed?.why).toBe('A smaller version of today’s')
    expect(missed?.text).toMatch(/10 minutes/)
    expect(tomorrowSuggestion({ text: 'x', kept: true }, true)).toBeNull()
    expect(tomorrowSuggestion(null, false)).toBeNull()
  })
})
