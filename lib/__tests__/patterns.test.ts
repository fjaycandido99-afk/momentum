import { describe, expect, it } from 'vitest'
import {
  coachPatternLine,
  computeScores,
  findPatterns,
  weakDayLine,
  MAX_PATTERNS,
  MIN_ANSWERED_TOTAL,
  PATTERN_DISCLAIMER,
  type GuideMood,
  type MoodLevel,
  type PatternInput,
  type PromiseRecord,
} from '../patterns/rules'

/** A day string N days after 2026-09-01, so consecutive runs are easy to build. */
const day = (i: number) => new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10)

const promise = (over: Partial<PromiseRecord> & { day: string }): PromiseRecord => ({
  hour: 7,
  weekday: new Date(`${over.day}T00:00:00Z`).getUTCDay(),
  kept: true,
  answeredSameDay: true,
  source: 'typed',
  length: 20,
  confidence: null,
  blocker: null,
  helper: null,
  ...over,
})

const input = (over: Partial<PatternInput> = {}): PatternInput => ({
  promises: [],
  moods: [],
  guideMoods: [],
  ...over,
})

describe('findPatterns — silence before evidence', () => {
  it('says nothing at all with a handful of promises', () => {
    const promises = Array.from({ length: MIN_ANSWERED_TOTAL - 1 }, (_, i) =>
      promise({ day: day(i), hour: i % 2 ? 6 : 20, kept: i % 2 === 0 }))
    const report = findPatterns(input({ promises }))
    expect(report.patterns).toEqual([])
    expect(report.needs.answeredPromises).toBe(1)
    expect(report.basis.answeredPromises).toBe(MIN_ANSWERED_TOTAL - 1)
  })

  it('ignores unanswered promises when counting evidence', () => {
    const promises = Array.from({ length: 30 }, (_, i) => promise({ day: day(i), kept: null }))
    const report = findPatterns(input({ promises }))
    expect(report.basis.answeredPromises).toBe(0)
    expect(report.needs.answeredPromises).toBe(MIN_ANSWERED_TOTAL)
    expect(report.patterns).toEqual([])
  })

  it('needs both sides of a comparison, not just a big total', () => {
    // 20 answered promises, every one made before 8am: nothing to compare.
    const promises = Array.from({ length: 20 }, (_, i) => promise({ day: day(i), hour: 6, kept: i % 3 !== 0 }))
    const report = findPatterns(input({ promises }))
    expect(report.patterns.find(p => p.kind === 'timing')).toBeUndefined()
  })

  it('stays quiet when the two sides are close', () => {
    // 10 early (80% kept) and 10 evening (70% kept): a 10-point gap, under the bar.
    const early = Array.from({ length: 10 }, (_, i) => promise({ day: day(i), hour: 6, kept: i > 1 }))
    const late = Array.from({ length: 10 }, (_, i) => promise({ day: day(20 + i), hour: 21, kept: i > 2 }))
    const report = findPatterns(input({ promises: [...early, ...late] }))
    expect(report.patterns.find(p => p.kind === 'timing')).toBeUndefined()
  })
})

describe('findPatterns — what it says when the evidence is there', () => {
  const early = Array.from({ length: 10 }, (_, i) => promise({ day: day(i), hour: 6, kept: i > 0 }))
  const late = Array.from({ length: 10 }, (_, i) => promise({ day: day(20 + i), hour: 14, kept: i < 4 }))

  it('reports both sides with their counts, and no verdict', () => {
    const report = findPatterns(input({ promises: [...early, ...late] }))
    const timing = report.patterns.find(p => p.kind === 'timing')!
    expect(timing.headline).toBe('You keep 90% of the promises you make before 8am — and 40% of the ones you make in the afternoon.')
    expect(timing.detail).toBe('9 of 10 against 4 of 10.')
    expect(timing.groups.map(g => `${g.label}:${g.hits}/${g.of}`)).toEqual(['before 8am:9/10', 'in the afternoon:4/10'])
    expect(timing.gap).toBe(50)
    expect(timing.strength).toBe('solid')
  })

  it('carries the disclaimer and the basis every time', () => {
    const report = findPatterns(input({ promises: [...early, ...late] }))
    expect(report.disclaimer).toBe(PATTERN_DISCLAIMER)
    expect(report.basis).toMatchObject({ answeredPromises: 20, rulesVersion: 1 })
  })

  it('links mood to kept promises as a link, never a cause', () => {
    const promises = [
      ...Array.from({ length: 8 }, (_, i) => promise({ day: day(i), kept: true })),
      ...Array.from({ length: 8 }, (_, i) => promise({ day: day(20 + i), kept: false })),
    ]
    const moods: PatternInput['moods'] = [
      ...Array.from({ length: 8 }, (_, i) => ({ day: day(i), mood: (i < 7 ? 'great' : 'okay') as MoodLevel })),
      ...Array.from({ length: 8 }, (_, i) => ({ day: day(20 + i), mood: (i < 2 ? 'good' : 'low') as MoodLevel })),
    ]
    const mood = findPatterns(input({ promises, moods })).patterns.find(p => p.kind === 'mood')!
    expect(mood.headline).toBe('You logged a good day 87.5% of the time when you kept your promise, and 25% of the time when you didn\'t.')
    expect(mood.detail).toContain("That's a link, not a cause")
  })

  it('only counts consecutive days for momentum', () => {
    // Kept on even days, missed on odd ones, all consecutive.
    const promises = Array.from({ length: 24 }, (_, i) => promise({ day: day(i), kept: i % 2 === 0 }))
    const momentum = findPatterns(input({ promises })).patterns.find(p => p.kind === 'momentum')
    // After a kept day it's always missed and vice versa — a 100-point gap.
    expect(momentum?.gap).toBe(100)
    // A history with gaps between every day has no "day after" at all.
    const spaced = Array.from({ length: 24 }, (_, i) => promise({ day: day(i * 3), kept: i % 2 === 0 }))
    expect(findPatterns(input({ promises: spaced })).patterns.find(p => p.kind === 'momentum')).toBeUndefined()
  })

  it('reports guide days on their own, without promise data', () => {
    const guideMoods = Array.from({ length: 10 }, (_, i) => ({
      day: day(i),
      before: 'low' as GuideMood,
      after: (i < 7 ? 'high' : 'low') as GuideMood,
    }))
    const report = findPatterns(input({ guideMoods }))
    const guide = report.patterns.find(p => p.kind === 'guide')!
    expect(guide.headline).toBe('Your mood ended higher than it started on 70% of the days you ran the guide.')
    expect(guide.groups).toHaveLength(1)
  })

  it('orders by the size of the difference and caps the list', () => {
    const promises = [
      ...Array.from({ length: 10 }, (_, i) => promise({ day: day(i), hour: 6, kept: i > 0, source: 'spoken', length: 10, answeredSameDay: true })),
      ...Array.from({ length: 10 }, (_, i) => promise({ day: day(20 + i), hour: 14, kept: i < 4, source: 'typed', length: 90, answeredSameDay: false })),
    ]
    const report = findPatterns(input({ promises }))
    expect(report.patterns.length).toBeLessThanOrEqual(MAX_PATTERNS)
    const gaps = report.patterns.map(p => p.gap)
    expect([...gaps]).toEqual([...gaps].sort((a, b) => b - a))
  })

  it('is deterministic for the same history', () => {
    const promises = [...early, ...late]
    expect(JSON.stringify(findPatterns(input({ promises })))).toBe(JSON.stringify(findPatterns(input({ promises }))))
  })

  it('never produces a rate that is not a number', () => {
    const report = findPatterns(input({ promises: [], moods: [], guideMoods: [] }))
    expect(report.patterns).toEqual([])
    for (const p of findPatterns(input({ promises: [...early, ...late] })).patterns) {
      for (const g of p.groups) expect(Number.isFinite(g.rate)).toBe(true)
    }
  })
})

describe('the one-tap answers', () => {
  const label = (k: string) => ({ too_tired: 'Too tired', no_time: 'No time', the_audio: 'The audio' }[k] ?? k)

  it('tells them whether their own certainty means anything', () => {
    const promises = [
      ...Array.from({ length: 10 }, (_, i) => promise({ day: day(i), confidence: 5, kept: i > 0 })),
      ...Array.from({ length: 10 }, (_, i) => promise({ day: day(20 + i), confidence: 2, kept: i < 4 })),
    ]
    const p = findPatterns(input({ promises })).patterns.find(x => x.kind === 'confidence')!
    expect(p.headline).toBe("90% kept when you felt sure, 40% when you weren't.")
    expect(p.detail).toContain('9 of 10 against 4 of 10')
  })

  it('ignores promises where the scale was skipped', () => {
    const promises = Array.from({ length: 20 }, (_, i) => promise({ day: day(i), confidence: null, kept: i % 2 === 0 }))
    expect(findPatterns(input({ promises })).patterns.find(x => x.kind === 'confidence')).toBeUndefined()
  })

  it('names the most common blocker, from misses only', () => {
    const promises = [
      ...Array.from({ length: 4 }, (_, i) => promise({ day: day(i), kept: false, blocker: 'too_tired' })),
      ...Array.from({ length: 2 }, (_, i) => promise({ day: day(10 + i), kept: false, blocker: 'no_time' })),
      // A helper on a kept day must not be counted among the blockers.
      ...Array.from({ length: 8 }, (_, i) => promise({ day: day(20 + i), kept: true, helper: 'the_audio' })),
    ]
    const report = findPatterns(input({ promises, reasonLabel: label }))
    const blocker = report.patterns.find(x => x.kind === 'blocker')!
    expect(blocker.headline).toBe('What stops you most often: too tired — 4 of the 6 misses you told me about.')
    const helper = report.patterns.find(x => x.kind === 'helper')!
    expect(helper.headline).toBe('What helps you most often: the audio — 8 of the 8 keeps you told me about.')
  })

  it('needs enough tagged check-ins before naming one', () => {
    const promises = [
      ...Array.from({ length: 4 }, (_, i) => promise({ day: day(i), kept: false, blocker: 'too_tired' })),
      ...Array.from({ length: 8 }, (_, i) => promise({ day: day(20 + i), kept: true })),
    ]
    // Four tagged misses is under MIN_TAGGED — no "most common" yet.
    expect(findPatterns(input({ promises, reasonLabel: label })).patterns.find(x => x.kind === 'blocker')).toBeUndefined()
  })

  it('needs one answer to actually lead, not a five-way tie', () => {
    const keys = ['too_tired', 'no_time', 'forgot', 'put_it_off', 'too_big', 'life_happened']
    const promises = [
      ...keys.map((k, i) => promise({ day: day(i), kept: false, blocker: k })),
      ...Array.from({ length: 6 }, (_, i) => promise({ day: day(20 + i), kept: true })),
    ]
    expect(findPatterns(input({ promises, reasonLabel: label })).patterns.find(x => x.kind === 'blocker')).toBeUndefined()
  })
})

describe('weakDayLine — shrink the ask before the miss', () => {
  // Thursdays 1 of 6 kept; every other day 12 of 12. Thursday = weekday 4.
  const promises = [
    ...Array.from({ length: 6 }, (_, i) => promise({ day: day(3 + i * 7), weekday: 4, kept: i === 0 })),
    ...Array.from({ length: 12 }, (_, i) => promise({ day: day(1 + i * 2), weekday: 1, kept: true })),
  ]
  const report = findPatterns(input({ promises }))

  it('fires only on that weekday, and says what to do about it', () => {
    expect(weakDayLine(report, 4)).toBe("Thursdays are where you slip — 1 of 6 kept. Make today's promise small enough that you keep it.")
    for (const other of [0, 1, 2, 3, 5, 6]) expect(weakDayLine(report, other)).toBeNull()
  })

  it('stays silent without a solid weekday pattern', () => {
    expect(weakDayLine(findPatterns(input({ promises: [] })), 4)).toBeNull()
    // Four Thursdays is under the bar for calling a day someone's weak spot.
    const thin = findPatterns(input({
      promises: [
        ...Array.from({ length: 4 }, (_, i) => promise({ day: day(3 + i * 7), weekday: 4, kept: false })),
        ...Array.from({ length: 10 }, (_, i) => promise({ day: day(1 + i * 2), weekday: 1, kept: true })),
      ],
    }))
    expect(weakDayLine(thin, 4)).toBeNull()
  })
})

describe('computeScores', () => {
  it('reports each rate with its counts, and no composite', () => {
    const promises = [
      ...Array.from({ length: 8 }, (_, i) => promise({ day: day(i), kept: i > 1 })),
      ...Array.from({ length: 2 }, (_, i) => promise({ day: day(10 + i), kept: null })),
    ]
    const scores = computeScores({ promises, moods: [], guideMoods: [], today: day(9) })
    const follow = scores.find(s => s.id === 'follow_through')!
    expect(follow).toMatchObject({ value: 75, unit: '%', detail: '6 of 8 answered promises kept' })
    expect(scores.find(s => s.id === 'showing_up')).toMatchObject({ value: 8, unit: 'days' })
    // No blended score: every entry is one rate someone can check.
    expect(scores.every(s => s.detail.length > 0)).toBe(true)
  })

  it('needs a few real returns before averaging a bounce-back', () => {
    const twoMisses = [
      promise({ day: day(0), kept: false }), promise({ day: day(1), kept: true }),
      promise({ day: day(2), kept: false }), promise({ day: day(3), kept: true }),
    ]
    expect(computeScores({ promises: twoMisses, moods: [], guideMoods: [] }).find(s => s.id === 'bounce_back')).toBeUndefined()

    const threeMisses = [...twoMisses, promise({ day: day(4), kept: false }), promise({ day: day(6), kept: true })]
    const bounce = computeScores({ promises: threeMisses, moods: [], guideMoods: [] }).find(s => s.id === 'bounce_back')!
    expect(bounce).toMatchObject({ value: 1, unit: 'days' })
    expect(bounce.detail).toContain('3 misses')
  })

  it('scores low-mood days only with enough of them', () => {
    const promises = Array.from({ length: 6 }, (_, i) => promise({ day: day(i), kept: i < 2 }))
    const moods = Array.from({ length: 6 }, (_, i) => ({ day: day(i), mood: 'low' as MoodLevel }))
    const low = computeScores({ promises, moods, guideMoods: [] }).find(s => s.id === 'low_day')!
    expect(low).toMatchObject({ value: 33.3, unit: '%' })
    expect(low.detail).toBe('2 of 6 kept on days you logged a low mood')
    const few = computeScores({ promises: promises.slice(0, 4), moods: moods.slice(0, 4), guideMoods: [] })
    expect(few.find(s => s.id === 'low_day')).toBeUndefined()
  })

  it('says nothing from an empty history', () => {
    expect(computeScores({ promises: [], moods: [], guideMoods: [], today: day(0) })).toEqual([])
  })
})

describe('coachPatternLine', () => {
  const early = Array.from({ length: 10 }, (_, i) => promise({ day: day(i), hour: 6, kept: i > 0 }))
  const late = Array.from({ length: 10 }, (_, i) => promise({ day: day(20 + i), hour: 14, kept: i < 4 }))

  it('hands the coach one solid, promise-relevant line', () => {
    const line = coachPatternLine(findPatterns(input({ promises: [...early, ...late] })))
    expect(line).toBe('You keep 90% of the promises you make before 8am — and 40% of the ones you make in the afternoon. (9 of 10 against 4 of 10.)')
  })

  it('gives the coach nothing when there is nothing solid to say', () => {
    expect(coachPatternLine(findPatterns(input({ promises: [] })))).toBeNull()
    // A weekday or mood observation is not the coach's business at 6am.
    const moodOnly = findPatterns(input({
      promises: [
        ...Array.from({ length: 8 }, (_, i) => promise({ day: day(i), kept: true })),
        ...Array.from({ length: 8 }, (_, i) => promise({ day: day(20 + i), kept: false })),
      ],
      moods: [
        ...Array.from({ length: 8 }, (_, i) => ({ day: day(i), mood: 'great' as const })),
        ...Array.from({ length: 8 }, (_, i) => ({ day: day(20 + i), mood: 'low' as const })),
      ],
    }))
    expect(moodOnly.patterns.some(p => p.kind === 'mood')).toBe(true)
    expect(coachPatternLine(moodOnly)).toBeNull()
  })
})
