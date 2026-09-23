import { describe, it, expect } from 'vitest'
import {
  adherence,
  cleanPractice,
  currentRun,
  dayName,
  daysLabel,
  nextDueDay,
  practiceHistory,
  weakestWeekday,
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
  isCustomPreset,
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

  it('gives every preset a floor except the custom ones, which ask', () => {
    for (const p of PRACTICE_PRESETS) {
      // Plural now: there is a "Something else" inside every domain, so a
      // custom reading habit keeps domain 'read' and still gets the reading
      // wording, the reading guide and the book link. Keyed off
      // isCustomPreset rather than `=== 'custom'` for exactly that reason.
      if (isCustomPreset(p.key)) expect(p.minimum, p.key).toBe('')
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

describe('nextDueDay and dayName', () => {
  it('finds the next scheduled day', () => {
    // Sunday 20th; gym is Mon/Tue/Thu/Fri.
    expect(nextDueDay(gym, '2026-09-20')).toBe('2026-09-21')
    // Monday → Tuesday.
    expect(nextDueDay(gym, '2026-09-21')).toBe('2026-09-22')
    // Tuesday → skips Wednesday.
    expect(nextDueDay(gym, '2026-09-22')).toBe('2026-09-24')
  })

  it('is always tomorrow for an every-day practice', () => {
    expect(nextDueDay(daily, '2026-09-20')).toBe('2026-09-21')
  })

  it('says "Tomorrow" when it is tomorrow, and the weekday otherwise', () => {
    expect(dayName('2026-09-21', '2026-09-20')).toBe('Tomorrow')
    expect(dayName('2026-09-24', '2026-09-22')).toBe('Thursday')
  })
})

describe('weakestWeekday', () => {
  const mondays = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21']

  it('says nothing until there are enough answered days on that weekday', () => {
    const logs = [log(mondays[0], false), log(mondays[1], false)]
    expect(weakestWeekday(gym, logs, '2026-08-25', '2026-09-21')).toBeNull()
  })

  it('names the weekday with the counts behind it', () => {
    const logs = [
      log(mondays[0], false), log(mondays[1], false), log(mondays[2], false), log(mondays[3], true),
      // Tuesdays all kept, so Monday is the one worth naming.
      log('2026-09-01', true), log('2026-09-08', true), log('2026-09-15', true),
    ]
    const weak = weakestWeekday(gym, logs, '2026-08-25', '2026-09-21')
    expect(weak).toEqual({ weekday: 1, missed: 3, of: 4 })
  })

  it('stays quiet when the misses are not the majority of that day', () => {
    const logs = [log(mondays[0], true), log(mondays[1], true), log(mondays[2], false), log(mondays[3], true)]
    const weak = weakestWeekday(gym, logs, '2026-08-25', '2026-09-21')
    expect(weak?.weekday).not.toBe(1)
  })

  it('never builds a claim out of silence', () => {
    // A brand-new discipline with no answers at all used to be told it
    // missed every Friday. Unanswered is unknown, not a miss.
    expect(weakestWeekday(gym, [], '2026-08-25', '2026-09-21')).toBeNull()
  })

  it('counts only the days they actually answered', () => {
    const logs = [
      log(mondays[0], false), log(mondays[1], false), log(mondays[2], false),
      // A Tuesday and a Thursday answered once each — not enough to name.
      log('2026-09-01', false), log('2026-09-03', false),
    ]
    expect(weakestWeekday(gym, logs, '2026-08-25', '2026-09-21')).toEqual({
      weekday: 1, missed: 3, of: 3,
    })
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

describe('practiceHistory — what the achievements count', () => {
  // Mon 2026-09-07 through Sun 2026-09-13, then the following week.
  const mon = '2026-09-07'
  const tue = '2026-09-08'
  const thu = '2026-09-10'
  const fri = '2026-09-11'
  const nextMon = '2026-09-14'

  const log = (day: string, done: boolean, minimumOnly = false) => ({ day, done, minimumOnly })

  it('counts kept days and minimum days separately', () => {
    const got = practiceHistory(gym, [
      log(mon, true),
      log(tue, true, true),
      log(thu, false),
    ])
    expect(got.kept).toBe(2)
    expect(got.minimumDays).toBe(1)
  })

  it('treats the minimum as KEPT, not as a half-failure', () => {
    // The whole reason the floor exists. A day on the minimum must never
    // break a run.
    const got = practiceHistory(gym, [
      log(mon, true),
      log(tue, true, true),
      log(thu, true),
      log(fri, true),
    ])
    expect(got.longestRun).toBe(4)
  })

  it('does not break a run on a day the discipline was never due', () => {
    // Gym is Mon/Tue/Thu/Fri. Wednesday missing is not a miss — it was
    // never asked for. A run that breaks on a rest day would punish
    // somebody for following their own schedule.
    const wed = '2026-09-09'
    const got = practiceHistory(gym, [
      log(mon, true),
      log(tue, true),
      log(wed, false), // logged but not due
      log(thu, true),
      log(fri, true),
    ])
    expect(got.longestRun).toBe(4)
  })

  it('breaks the run on a missed DUE day', () => {
    const got = practiceHistory(gym, [
      log(mon, true),
      log(tue, false),
      log(thu, true),
      log(fri, true),
    ])
    expect(got.longestRun).toBe(2)
  })

  it('counts a comeback: the next due day kept after one missed', () => {
    const got = practiceHistory(gym, [
      log(mon, true),
      log(tue, false),
      log(thu, true),
    ])
    expect(got.comebacks).toBe(1)
  })

  it('counts one comeback per return, not one per missed day', () => {
    const got = practiceHistory(gym, [
      log(mon, false),
      log(tue, false),
      log(thu, true), // one comeback, after two misses
      log(fri, false),
      log(nextMon, true), // a second
    ])
    expect(got.comebacks).toBe(2)
  })

  it('gives a first-ever kept day no comeback', () => {
    // Nothing to come back from. Somebody's very first day should not be
    // dressed up as a recovery.
    expect(practiceHistory(gym, [log(mon, true)]).comebacks).toBe(0)
  })

  it('handles an every-day discipline', () => {
    const got = practiceHistory(daily, [
      log(mon, true),
      log(tue, true),
      log('2026-09-09', true),
    ])
    expect(got.longestRun).toBe(3)
  })

  it('returns zeroes for no history at all', () => {
    expect(practiceHistory(gym, [])).toEqual({
      kept: 0, minimumDays: 0, longestRun: 0, comebacks: 0,
    })
  })

  it('does not care what order the logs arrive in', () => {
    const ordered = practiceHistory(gym, [log(mon, true), log(tue, true), log(thu, true)])
    const shuffled = practiceHistory(gym, [log(thu, true), log(mon, true), log(tue, true)])
    expect(shuffled).toEqual(ordered)
  })
})
