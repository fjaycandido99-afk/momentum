import { describe, it, expect } from 'vitest'
import { computeAlignment, alignmentLine, MIN_DURING, type AlignmentAnswer } from '../era/alignment'
import { pickNextItem, ASSESSMENT_ITEMS } from '../assessment/items'
import { ERA_PROGRAMS } from '../era/programs'
import { ERA_PRESETS } from '../era/presets'

const START = '2026-09-10'
// A discipline item that loads positively: score 5 = strongly "holds a structure".
const ans = (day: string, score: number, direction: 1 | -1 = 1): AlignmentAnswer => ({ axis: 'discipline', direction, score, local_day: day })
const days = (from: number, n: number) => Array.from({ length: n }, (_, i) => `2026-09-${String(from + i).padStart(2, '0')}`)

describe('computeAlignment', () => {
  const target = { axis: 'discipline' as const, direction: 1 as const }

  it('says nothing until the era has enough answers on its axis', () => {
    const a = computeAlignment(target, days(10, MIN_DURING - 1).map(d => ans(d, 5)), START)
    expect(a.status).toBe('early')
    expect(a.needed).toBe(1)
    expect(a.toward).toBe('Holds a structure')
  })

  it('reads movement against a baseline from before the era', () => {
    const before = days(1, 4).map(d => ans(d, 2)) // leaned "follows the day"
    const during = days(10, 6).map(d => ans(d, 4)) // now leaning "holds a structure"
    expect(computeAlignment(target, [...before, ...during], START).status).toBe('toward')
    const worse = days(10, 6).map(d => ans(d, 1))
    expect(computeAlignment(target, [...days(1, 4).map(d => ans(d, 3)), ...worse], START).status).toBe('away')
  })

  it('treats a small wobble as steady, not progress', () => {
    const before = days(1, 4).map(d => ans(d, 3)) // baseline: neutral
    const wobble = days(10, 6).map((d, i) => ans(d, i < 1 ? 4 : 3)) // era mean ≈ +0.17, under the 0.4 shift
    expect(computeAlignment(target, [...before, ...wobble], START).status).toBe('steady')
  })

  it('respects item direction — agreeing with a reverse-loaded item pulls the other way', () => {
    const during = days(10, 6).map(d => ans(d, 5, -1))
    expect(computeAlignment(target, during, START).status).toBe('away')
  })

  it('points the other way for a low-pole era (Stoic Mode → Accepts what comes)', () => {
    const stoic = { axis: 'agency' as const, direction: -1 as const }
    const during = days(10, 6).map(d => ({ axis: 'agency' as const, direction: 1 as const, score: 1, local_day: d }))
    const a = computeAlignment(stoic, during, START)
    expect(a.toward).toBe('Accepts what comes')
    expect(a.status).toBe('toward')
  })

  it('only ever words a direction, never a number', () => {
    const line = alignmentLine(computeAlignment(target, days(10, 6).map(d => ans(d, 5)), START))
    expect(line).toMatch(/someone who holds a structure/)
    expect(line).not.toMatch(/\d+%|score/)
  })
})

describe('era read targets', () => {
  it('every preset era targets a real axis; custom eras target none', () => {
    for (const p of ERA_PRESETS) expect(ERA_PROGRAMS[p.key].readTarget, p.key).toBeTruthy()
    expect(ERA_PROGRAMS.custom.readTarget).toBeUndefined()
  })
})

describe('pickNextItem with an era focus', () => {
  it('asks from the focus axis about half the time, and never starves the rest', () => {
    let calls = 0
    const random = () => ((calls++ * 0.61803) % 1) // deterministic spread over [0,1)
    const coverage = { agency: 0, discipline: 0, inquiry: 0, faith: 0 }
    const axes: string[] = []
    for (let i = 0; i < 400; i++) axes.push(pickNextItem(new Set(), coverage, [], random, 'discipline')!.axis)
    const share = axes.filter(a => a === 'discipline').length / axes.length
    expect(share).toBeGreaterThan(0.5)
    expect(share).toBeLessThan(0.8)
    expect(new Set(axes).size).toBe(4)
  })

  it('without a focus behaves as before', () => {
    const item = pickNextItem(new Set(), { agency: 5, discipline: 5, inquiry: 0, faith: 5 }, [], () => 0.1)
    expect(item!.axis).toBe('inquiry')
    expect(ASSESSMENT_ITEMS.length).toBeGreaterThan(0)
  })
})
