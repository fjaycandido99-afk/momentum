import { describe, expect, it } from 'vitest'
import {
  buildEraReport,
  longestKeptRun,
  topReason,
  HALVES_MIN_PER_SIDE,
  type ReportInput,
  type ReportPromise,
} from '../era/report'

const label = (k: string) => ({ too_tired: 'Too tired', no_time: 'No time', the_audio: 'The audio' }[k] ?? k)

const promise = (day: number, kept: boolean | null, extra: Partial<ReportPromise> = {}): ReportPromise => ({
  day, kept, blocker: null, helper: null, ...extra,
})

const input = (over: Partial<ReportInput> = {}): ReportInput => ({
  eraTitle: 'Locked In',
  lengthDays: 30,
  promises: [],
  missionDays: [],
  wellness: [],
  ...over,
})

const find = (r: ReturnType<typeof buildEraReport>, label: string) => r.lines.find(l => l.label === label)

describe('longestKeptRun', () => {
  it('counts consecutive kept days only', () => {
    expect(longestKeptRun([promise(1, true), promise(2, true), promise(3, false), promise(4, true)])).toBe(2)
    // A gap in the days breaks the run even with no "not kept" between them.
    expect(longestKeptRun([promise(1, true), promise(3, true), promise(4, true)])).toBe(2)
    expect(longestKeptRun([promise(1, false)])).toBe(0)
    expect(longestKeptRun([])).toBe(0)
  })
})

describe('topReason', () => {
  it('needs a few tags and a clear leader', () => {
    expect(topReason(['too_tired', 'too_tired'])).toBeNull() // under the minimum
    expect(topReason(['too_tired', 'too_tired', 'no_time'])).toMatchObject({ key: 'too_tired', count: 2, of: 3 })
    expect(topReason([null, null, null])).toBeNull()
  })
})

describe('buildEraReport', () => {
  it('counts what happened, with the numbers behind each line', () => {
    const promises = [
      ...Array.from({ length: 12 }, (_, i) => promise(i + 1, i > 2, { blocker: i > 2 ? null : 'too_tired', helper: i > 2 ? 'the_audio' : null })),
      ...Array.from({ length: 10 }, (_, i) => promise(i + 16, i < 8, { blocker: i < 8 ? null : 'no_time', helper: i < 8 ? 'the_audio' : null })),
    ]
    const r = buildEraReport(input({ promises, missionDays: [1, 2, 5, 9] }), label)

    expect(find(r, 'Promises made')).toMatchObject({ value: '22', detail: 'over 30 days' })
    expect(find(r, 'Kept')).toMatchObject({ value: '17 of 22', detail: '77% of the ones you answered' })
    expect(find(r, 'Missions done')).toMatchObject({ value: '4', detail: 'of 30 offered' })
    expect(find(r, 'What stopped you most')).toMatchObject({ value: 'Too tired' })
    expect(find(r, 'What helped most')).toMatchObject({ value: 'The audio' })
    // Every line either carries its counts or is a bare count itself.
    for (const line of r.lines) expect(line.value.length).toBeGreaterThan(0)
  })

  it('compares halves instead of inventing a consistency score', () => {
    const promises = [
      ...Array.from({ length: 10 }, (_, i) => promise(i + 1, i < 5)), // 50% in the first half
      ...Array.from({ length: 10 }, (_, i) => promise(i + 16, i < 9)), // 90% in the second
    ]
    const r = buildEraReport(input({ promises }), label)
    expect(r.halves).toMatchObject({
      firstHalf: { kept: 5, answered: 10, percent: 50 },
      secondHalf: { kept: 9, answered: 10, percent: 90 },
      change: 40,
    })
    // No blended score anywhere in the report.
    expect(r.lines.some(l => /consistency|score/i.test(l.label))).toBe(false)
  })

  it('omits the halves comparison rather than compare thin ones, and says so', () => {
    const promises = [
      ...Array.from({ length: HALVES_MIN_PER_SIDE }, (_, i) => promise(i + 1, true)),
      promise(20, true), // only one answer in the second half
    ]
    const r = buildEraReport(input({ promises }), label)
    expect(r.halves).toBeNull()
    expect(r.missing.join(' ')).toContain('Too few answers in one half')
  })

  it('reports energy and mood only with real days on both sides', () => {
    const promises = Array.from({ length: 10 }, (_, i) => promise(i + 1, true))
    const thin = buildEraReport(input({
      promises,
      wellness: [{ day: 1, mood: 2, energy: 2 }, { day: 20, mood: 5, energy: 5 }],
    }), label)
    expect(find(thin, 'Energy, start to finish')).toBeUndefined()

    const enough = buildEraReport(input({
      promises,
      wellness: [
        ...Array.from({ length: 4 }, (_, i) => ({ day: i + 1, mood: 3, energy: 2 })),
        ...Array.from({ length: 4 }, (_, i) => ({ day: 20 + i, mood: 4, energy: 4 })),
      ],
    }), label)
    expect(find(enough, 'Energy, start to finish')).toMatchObject({ value: '2 → 4', detail: '4 days then 4 days, out of 5' })
  })

  it('reports each phase, including the ones they missed entirely', () => {
    const r = buildEraReport(input({ promises: [promise(1, true), promise(2, false)] }), label)
    expect(r.phases.map(p => `${p.phase}:${p.days}`)).toEqual(['1:2', '2:0', '3:0', '4:0'])
    expect(r.phases[0]).toMatchObject({ label: 'Starting', kept: 1, answered: 2 })
  })

  it('says plainly when nothing was ever answered', () => {
    const r = buildEraReport(input({ promises: [promise(1, null), promise(2, null)] }), label)
    expect(find(r, 'Kept')).toBeUndefined()
    expect(r.missing.join(' ')).toContain('never answered a promise')
    expect(find(r, 'Promises made')).toMatchObject({ value: '2' })
  })
})
