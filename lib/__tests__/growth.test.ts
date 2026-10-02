import { describe, it, expect } from 'vitest'
import {
  disciplineSurvival, disciplineTypes, eraInsights, featureBeforeRetention, guidedDays,
  MIN_PEOPLE, notificationOpens, promiseTiming, retention, type EraRow, type PromiseFact,
} from '@/lib/analytics/growth'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `u${i}`)

describe('growth: retention', () => {
  it('counts who came back on day N or later, of those who joined N+ days ago', () => {
    const users = ids(6).map((id, i) => ({
      id, joined: '2026-09-01',
      active: new Set(i < 3 ? ['2026-09-01', '2026-09-09'] : ['2026-09-01']),
    }))
    const r = retention(users, '2026-10-01')
    expect(r.find(x => x.day === 7)?.result).toEqual({ hits: 3, of: 6, rate: 50 })
    expect(r.find(x => x.day === 30)?.result).toEqual({ hits: 0, of: 6, rate: 0 })
  })

  it('stays silent below the minimum number of people', () => {
    const users = ids(MIN_PEOPLE - 1).map(id => ({ id, joined: '2026-09-01', active: new Set(['2026-09-20']) }))
    expect(retention(users, '2026-10-01').every(x => x.result === null)).toBe(true)
  })
})

describe('growth: eras', () => {
  const done = (userId: string): EraRow => ({
    userId, startDay: '2026-08-01', lengthDays: 30, endDay: '2026-08-30', over: true,
    promiseDays: Array.from({ length: 25 }, (_, i) => i + 1),
  })
  const quit = (userId: string, lastDay: number): EraRow => ({
    userId, startDay: '2026-08-01', lengthDays: 30, endDay: '2026-08-12', over: true,
    promiseDays: Array.from({ length: lastDay }, (_, i) => i + 1),
  })

  it('reports completion, the week people drop, and second eras', () => {
    const eras = [
      ...ids(5).map(done),
      quit('q1', 3), quit('q2', 10), quit('q3', 11),
      { ...done('u0'), startDay: '2026-09-05', endDay: '2026-10-04', over: false },
    ]
    const r = eraInsights(eras)
    expect(r.completion).toEqual({ hits: 5, of: 8, rate: 62.5 })
    expect(r.dropWeeks).toEqual([{ week: 1, count: 1 }, { week: 2, count: 2 }, { week: 3, count: 0 }, { week: 4, count: 0 }])
    expect(r.secondEra).toEqual({ hits: 1, of: 5, rate: 20 })
  })
})

describe('growth: disciplines', () => {
  it('counts disciplines 4+ weeks old still kept in the last 2 weeks', () => {
    const rows = ids(6).map((userId, i) => ({ userId, createdDay: '2026-08-01', keptDays: i < 2 ? ['2026-09-25'] : ['2026-08-10'] }))
    expect(disciplineSurvival(rows, '2026-10-01').alive).toEqual({ hits: 2, of: 6, rate: 33.3 })
  })
})

describe('growth: before people stayed', () => {
  it('compares early use among people who stayed and people who left', () => {
    const users = [
      ...ids(5).map(id => ({ id, early: new Set(['era']), stayed: true })),
      ...ids(5).map(id => ({ id: `l${id}`, early: new Set<string>(), stayed: false })),
    ]
    const r = featureBeforeRetention(users, ['era', 'journal'])!
    expect(r[0]).toEqual({ feature: 'era', stayed: { hits: 5, of: 5, rate: 100 }, left: { hits: 0, of: 5, rate: 0 } })
  })

  it('needs enough people on both sides', () => {
    expect(featureBeforeRetention(ids(5).map(id => ({ id, early: new Set<string>(), stayed: true })), ['era'])).toBeNull()
  })
})

describe('growth: notifications', () => {
  it('rates opens per type only with enough people', () => {
    const sends = ids(5).map(userId => ({ userId, type: 'daily_quote', hour: 8 }))
    const opens = [{ userId: 'u0', type: 'daily_quote' }, { userId: 'u1', type: 'daily_quote' }]
    const r = notificationOpens(sends, opens)
    expect(r.byType[0].result).toEqual({ hits: 2, of: 5, rate: 40 })
    expect(r.sentByHour[0]).toEqual({ label: 'Before 9 AM', sent: 5, people: 5 })
  })
})

describe('growth: the patterns across everyone', () => {
  const p = (userId: string, hour: number, kept: boolean, day = '2026-09-10'): PromiseFact => ({ userId, day, hour, kept })

  it('shows a timing line only with enough people behind it', () => {
    const rows = [...ids(5).map(u => p(u, 7, true)), ...ids(3).map(u => p(u, 20, false))]
    const lines = promiseTiming(rows)
    expect(lines.map(l => l.label)).toEqual(['Made before 9 AM'])
    expect(lines[0]).toEqual({ label: 'Made before 9 AM', result: { hits: 5, of: 5, rate: 100 }, people: 5 })
  })

  it('splits by guided days per person and day', () => {
    const rows = [...ids(5).map(u => p(u, 9, true, '2026-09-10')), ...ids(5).map(u => p(u, 9, false, '2026-09-11'))]
    const guided = new Set(ids(5).map(u => `${u}|2026-09-10`))
    const lines = guidedDays(rows, guided)
    expect(lines[0].result.rate).toBe(100)
    expect(lines[1].result.rate).toBe(0)
  })

  it('groups disciplines by type, never by name', () => {
    const logs = [...ids(5).map(userId => ({ userId, domain: 'read', kept: true })), ...ids(5).map(userId => ({ userId, domain: 'gym', kept: false }))]
    expect(disciplineTypes(logs).map(l => l.label)).toEqual(['read', 'gym'])
  })
})
