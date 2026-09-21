import { describe, it, expect } from 'vitest'
import {
  INTERVENE_MIN_DUE,
  findIntervention,
  interventionLine,
  interventionPush,
  weekdayRecord,
} from '@/lib/practices/intervention'
import type { LogLite, PracticeLite } from '@/lib/practices/logic'

const gym: PracticeLite = {
  id: 'p1',
  label: 'Gym — Full body, 3×',
  days: [1, 3, 5], // Mon, Wed, Fri
  minimum: '40 minutes',
}

const log = (day: string, done: boolean): LogLite => ({ day, done, minimumOnly: false })

// Fridays in October 2026, and the Friday we're standing on.
const fridays = ['2026-10-02', '2026-10-09', '2026-10-16', '2026-10-23']
const today = '2026-10-30' // a Friday
const mondays = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']

describe('weekdayRecord', () => {
  it('counts only answered, due days of that weekday', () => {
    const logs = [
      ...fridays.map(d => log(d, false)),
      ...mondays.map(d => log(d, true)),
      log('2026-10-06', false), // a Tuesday: not due, must not count
    ]
    expect(weekdayRecord(gym, logs, 5)).toEqual({ missed: 4, of: 4 })
    expect(weekdayRecord(gym, logs, 1)).toEqual({ missed: 0, of: 4 })
    expect(weekdayRecord(gym, logs, 2)).toEqual({ missed: 0, of: 0 })
  })
})

describe('findIntervention', () => {
  it('fires on a weekday with a history of misses', () => {
    const logs = fridays.map(d => log(d, false))
    const found = findIntervention(gym, logs, today, '40 minutes')
    expect(found).toBeTruthy()
    expect(found!.line).toBe('Fridays are your hardest — you’ve missed 4 of the last 4. Today, 40 minutes counts.')
  })

  it('offers the day’s own floor when it has one', () => {
    const logs = fridays.map(d => log(d, false))
    const found = findIntervention(gym, logs, today, 'first 2 exercises')
    expect(found!.line).toContain('first 2 exercises counts')
  })

  it('says nothing on a weekday it has barely seen', () => {
    const logs = fridays.slice(0, 2).map(d => log(d, false))
    expect(findIntervention(gym, logs, today, '40 minutes')).toBeNull()
    expect(INTERVENE_MIN_DUE).toBe(3)
  })

  it('says nothing built out of unanswered days', () => {
    // Four Fridays with no answers at all is not evidence of anything.
    expect(findIntervention(gym, [], today, '40 minutes')).toBeNull()
  })

  it('says nothing when the misses are not the majority', () => {
    const logs = [log(fridays[0], false), log(fridays[1], true), log(fridays[2], true), log(fridays[3], true)]
    expect(findIntervention(gym, logs, today, '40 minutes')).toBeNull()
  })

  it('does not fire on a day the practice is not due', () => {
    const logs = fridays.map(d => log(d, false))
    // Tuesday.
    expect(findIntervention(gym, logs, '2026-10-27', '40 minutes')).toBeNull()
  })

  it('does not fire once today has been answered', () => {
    // It exists to arrive BEFORE the day is spent.
    const logs = [...fridays.map(d => log(d, false)), log(today, true)]
    expect(findIntervention(gym, logs, today, '40 minutes')).toBeNull()
  })
})

describe('the wording', () => {
  it('never describes the person, only the count', () => {
    const line = interventionLine(5, { missed: 3, of: 4 }, '20 minutes')
    expect(line).toContain('3 of the last 4')
    expect(line).not.toMatch(/you always|you never|lazy|bad at|give up|fail/i)
  })

  it('still works with no minimum set', () => {
    expect(interventionLine(5, { missed: 3, of: 4 }, '')).toContain('smallest version')
  })

  it('makes a push that offers the floor rather than a warning', () => {
    const push = interventionPush('Gym — Full body, 3×', {
      weekday: 5,
      missed: 3,
      of: 4,
      minimum: '40 minutes',
      line: '',
    })
    expect(push.title).toBe('Gym — Full body, 3×')
    expect(push.body).toContain('40 minutes counts today')
    expect(push.body).not.toMatch(/don't break|streak|failed|again/i)
  })
})
