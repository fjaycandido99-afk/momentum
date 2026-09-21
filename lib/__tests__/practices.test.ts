import { describe, it, expect } from 'vitest'
import {
  adherence,
  cleanPractice,
  currentRun,
  daysLabel,
  isCleanPractice,
  isDueOn,
  minimumLine,
  nightNudge,
  stateOn,
  weekdayOf,
  weekStrip,
  type LogLite,
  type PracticeLite,
} from '@/lib/practices/logic'
import {
  MAX_PRACTICES,
  PRACTICE_PRESETS,
  PRESETS_BY_KEY,
  presetsForDomain,
  DOMAINS,
} from '@/lib/practices/presets'

const gym: PracticeLite = { id: 'p1', label: 'Gym — PPL', days: [1, 2, 4, 5], minimum: '30 minutes' }
const daily: PracticeLite = { id: 'p2', label: 'Read', days: [], minimum: '10 pages' }

const log = (day: string, done: boolean, minimumOnly = false): LogLite => ({ day, done, minimumOnly })

describe('the presets', () => {
  it('has no duplicate keys and every domain has options', () => {
    expect(PRESETS_BY_KEY.size).toBe(PRACTICE_PRESETS.length)
    for (const d of DOMAINS) expect(presetsForDomain(d.id).length, d.id).toBeGreaterThan(0)
  })

  it('gives every preset a floor except the custom one, which asks', () => {
    for (const p of PRACTICE_PRESETS) {
      if (p.key === 'custom') expect(p.minimum).toBe('')
      else expect(p.minimum.length, p.key).toBeGreaterThan(0)
      expect(p.hint.length, p.key).toBeGreaterThan(5)
      for (const d of p.days) expect(d).toBeGreaterThanOrEqual(0)
      for (const d of p.days) expect(d).toBeLessThanOrEqual(6)
    }
  })

  it('caps practices at three', () => {
    expect(MAX_PRACTICES).toBe(3)
  })

  it('promises no programme it does not provide', () => {
    // No Couch-to-5K, marathon plan, exam schedule or "a book a month":
    // those imply structure Voxu has not written.
    const banned = /couch|marathon|exam|book a month|c25k|language/i
    for (const p of PRACTICE_PRESETS) {
      expect(banned.test(p.label), p.label).toBe(false)
      expect(banned.test(p.hint), p.hint).toBe(false)
    }
  })
})

describe('weekdayOf', () => {
  it('reads the weekday off the date, not the timezone', () => {
    expect(weekdayOf('2026-09-20')).toBe(0) // Sunday
    expect(weekdayOf('2026-09-21')).toBe(1)
    expect(weekdayOf('2026-09-26')).toBe(6)
  })
})

describe('isDueOn', () => {
  it('follows the schedule', () => {
    expect(isDueOn(gym, '2026-09-21')).toBe(true) // Monday
    expect(isDueOn(gym, '2026-09-23')).toBe(false) // Wednesday
  })

  it('treats an empty schedule as every day', () => {
    expect(isDueOn(daily, '2026-09-23')).toBe(true)
    expect(isDueOn(daily, '2026-09-20')).toBe(true)
  })
})

describe('stateOn', () => {
  it('separates due, done, minimum-only, missed and rest', () => {
    expect(stateOn(gym, [], '2026-09-21')).toBe('due')
    expect(stateOn(gym, [], '2026-09-23')).toBe('rest')
    expect(stateOn(gym, [log('2026-09-21', true)], '2026-09-21')).toBe('done')
    expect(stateOn(gym, [log('2026-09-21', true, true)], '2026-09-21')).toBe('minimum')
    expect(stateOn(gym, [log('2026-09-21', false)], '2026-09-21')).toBe('missed')
  })

  it('counts a session logged on a rest day, rather than hiding it', () => {
    // Trained on a Wednesday that wasn't scheduled: it happened, so it says
    // so. Never discard a record because the schedule didn't expect it.
    expect(stateOn(gym, [log('2026-09-23', true)], '2026-09-23')).toBe('done')
  })
})

describe('adherence', () => {
  it('only counts days the practice was due', () => {
    const logs = [log('2026-09-21', true), log('2026-09-22', true), log('2026-09-24', false)]
    // Mon 21 → Fri 25: due Mon, Tue, Thu, Fri = 4 days.
    const a = adherence(gym, logs, '2026-09-21', '2026-09-25')
    expect(a).toEqual({ done: 2, of: 4 })
  })

  it('never invents a percentage', () => {
    const a = adherence(gym, [], '2026-09-21', '2026-09-25')
    expect(a).toEqual({ done: 0, of: 4 })
  })

  it('counts every day for an every-day practice', () => {
    expect(adherence(daily, [], '2026-09-21', '2026-09-27').of).toBe(7)
  })
})

describe('currentRun', () => {
  it('counts consecutive due days kept', () => {
    const logs = [log('2026-09-21', true), log('2026-09-22', true)]
    expect(currentRun(gym, logs, '2026-09-22')).toBe(2)
  })

  it('does not break on a day that has not been answered yet', () => {
    const logs = [log('2026-09-21', true), log('2026-09-22', true)]
    // Thursday is due and unanswered; the run so far is still two.
    expect(currentRun(gym, logs, '2026-09-24')).toBe(2)
  })

  it('does not break on a rest day', () => {
    const logs = [log('2026-09-21', true), log('2026-09-22', true), log('2026-09-24', true)]
    expect(currentRun(gym, logs, '2026-09-24')).toBe(3)
  })

  it('breaks on a miss', () => {
    const logs = [log('2026-09-21', true), log('2026-09-22', false)]
    expect(currentRun(gym, logs, '2026-09-22')).toBe(0)
  })

  it('counts a minimum-only day as kept', () => {
    const logs = [log('2026-09-21', true, true), log('2026-09-22', true)]
    expect(currentRun(gym, logs, '2026-09-22')).toBe(2)
  })
})

describe('weekStrip', () => {
  it('returns seven days, oldest first, ending today', () => {
    const strip = weekStrip(gym, [], '2026-09-20')
    expect(strip).toHaveLength(7)
    expect(strip[0].day).toBe('2026-09-14')
    expect(strip[6].day).toBe('2026-09-20')
  })

  it('marks each day with what happened', () => {
    const logs = [log('2026-09-21', true), log('2026-09-22', true, true), log('2026-09-24', false)]
    const strip = weekStrip(gym, logs, '2026-09-25')
    const at = (day: string) => strip.find(d => d.day === day)!.state
    expect(at('2026-09-21')).toBe('done')
    expect(at('2026-09-22')).toBe('minimum')
    expect(at('2026-09-23')).toBe('rest') // Wednesday, not a training day
    expect(at('2026-09-24')).toBe('missed')
    expect(at('2026-09-25')).toBe('due') // today, unanswered
  })
})

describe('minimumLine', () => {
  it('quotes their own floor back at them', () => {
    expect(minimumLine(gym)).toContain('30 minutes')
    expect(minimumLine(gym)).toContain('negotiate')
  })

  it('still says something useful with no minimum set', () => {
    expect(minimumLine({ ...gym, minimum: '  ' })).toContain('smallest')
  })
})

describe('nightNudge', () => {
  it('says nothing when there is nothing to ask about', () => {
    expect(nightNudge([])).toBeNull()
  })

  it('quotes their own floor when one thing is open', () => {
    const nudge = nightNudge([gym])!
    expect(nudge.title).toBe('Gym — PPL')
    expect(nudge.body).toBe('You said 30 minutes. Did it happen?')
  })

  it('still asks when no floor was set', () => {
    const nudge = nightNudge([{ ...gym, minimum: '  ' }])!
    expect(nudge.body).toBe('Did it happen today?')
  })

  it('names them instead of stacking floors when several are open', () => {
    const nudge = nightNudge([gym, daily])!
    expect(nudge.title).toBe('Two things to close out')
    expect(nudge.body).toBe('Gym — PPL and Read — did they happen?')
    // No minimums in the body: a notification is one line.
    expect(nudge.body).not.toContain('30 minutes')
  })

  it('lists three with an Oxford-free comma', () => {
    const third: PracticeLite = { id: 'p3', label: 'Deep work', days: [], minimum: '45 minutes' }
    const nudge = nightNudge([gym, daily, third])!
    expect(nudge.title).toBe('Three things to close out')
    expect(nudge.body).toBe('Gym — PPL, Read and Deep work — did they happen?')
  })
})

describe('daysLabel', () => {
  it('names the schedule the way a person would', () => {
    expect(daysLabel([])).toBe('Every day')
    expect(daysLabel([0, 1, 2, 3, 4, 5, 6])).toBe('Every day')
    expect(daysLabel([1, 2, 3, 4, 5])).toBe('Weekdays')
    expect(daysLabel([0, 6])).toBe('Weekends')
    expect(daysLabel([1, 2, 4, 5])).toBe('Mon, Tue, Thu, Fri')
  })
})

describe('cleanPractice', () => {
  it('needs a preset that exists', () => {
    expect(cleanPractice({ presetKey: 'nope' })).toEqual({ error: 'Pick one of the practices' })
  })

  it('falls back to the preset for anything not given', () => {
    const clean = cleanPractice({ presetKey: 'gym_ppl' })
    expect(isCleanPractice(clean)).toBe(true)
    if (!isCleanPractice(clean)) return
    expect(clean.label).toBe('Gym — Push / Pull / Legs')
    expect(clean.minimum).toBe('30 minutes')
    expect(clean.days).toEqual([1, 2, 4, 5])
  })

  it('takes their own name, minimum and days', () => {
    const clean = cleanPractice({
      presetKey: 'gym_ppl',
      label: '  Lifting  ',
      minimum: ' 20 minutes ',
      days: [1, 3, 3, 9, -1, 5],
    })
    if (!isCleanPractice(clean)) throw new Error(clean.error)
    expect(clean.label).toBe('Lifting')
    expect(clean.minimum).toBe('20 minutes')
    expect(clean.days).toEqual([1, 3, 5])
  })

  it('insists on a minimum for a custom practice', () => {
    const clean = cleanPractice({ presetKey: 'custom', label: 'Piano' })
    expect(isCleanPractice(clean)).toBe(false)
  })

  it('refuses a name or minimum that is too long', () => {
    expect(isCleanPractice(cleanPractice({ presetKey: 'custom', label: 'x'.repeat(41), minimum: '5 min' }))).toBe(false)
    expect(isCleanPractice(cleanPractice({ presetKey: 'custom', label: 'ok', minimum: 'y'.repeat(41) }))).toBe(false)
  })
})
