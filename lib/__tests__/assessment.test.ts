import { describe, it, expect } from 'vitest'
import {
  computeRead,
  contribution,
  MINDSET_COORDS,
  AXIS_IDS,
  MIN_ANSWERS_FOR_READ,
  type ScoredAnswer,
  type AxisId,
} from '@/lib/assessment/axes'
import { ASSESSMENT_ITEMS, ITEMS_BY_ID, pickNextItem, pickSequence, SCALE, RE_ASK_AFTER_DAYS } from '@/lib/assessment/items'
import { MINDSET_IDS } from '@/lib/mindset/types'

const empty: Record<AxisId, number> = { agency: 0, discipline: 0, inquiry: 0, faith: 0 }

/** Answers that place someone exactly on a mindset's coordinates. */
function answersFor(mindset: keyof typeof MINDSET_COORDS, perAxis = 3): ScoredAnswer[] {
  const coords = MINDSET_COORDS[mindset]
  const out: ScoredAnswer[] = []
  for (const axis of AXIS_IDS) {
    for (let i = 0; i < perAxis; i++) {
      // score - 3 == coords, with direction +1
      out.push({ axis, direction: 1, score: coords[axis] + 3 })
    }
  }
  return out
}

describe('assessment scoring', () => {
  it('maps a 1-5 tap onto -2..+2 and respects the item direction', () => {
    expect(contribution({ axis: 'agency', direction: 1, score: 5 })).toBe(2)
    expect(contribution({ axis: 'agency', direction: 1, score: 3 })).toBe(0)
    expect(contribution({ axis: 'agency', direction: 1, score: 1 })).toBe(-2)
    // A reverse-loaded item: agreeing pushes the axis DOWN.
    expect(contribution({ axis: 'agency', direction: -1, score: 5 })).toBe(-2)
    expect(contribution({ axis: 'agency', direction: -1, score: 1 })).toBe(2)
  })

  it('refuses to name a lean before there is enough behind it', () => {
    const few: ScoredAnswer[] = Array.from({ length: MIN_ANSWERS_FOR_READ - 1 }, () => ({
      axis: 'agency' as AxisId, direction: 1 as const, score: 5,
    }))
    const read = computeRead(few)
    expect(read.lean).toBeNull()
    expect(read.confidence).toBe('none')
  })

  it('refuses to name a lean while any axis is still unheard from', () => {
    // Plenty of answers, but nothing on faith — a read here would be a guess.
    const lopsided: ScoredAnswer[] = [
      ...Array.from({ length: 8 }, () => ({ axis: 'agency' as AxisId, direction: 1 as const, score: 5 })),
      ...Array.from({ length: 8 }, () => ({ axis: 'discipline' as AxisId, direction: 1 as const, score: 5 })),
      ...Array.from({ length: 8 }, () => ({ axis: 'inquiry' as AxisId, direction: 1 as const, score: 5 })),
    ]
    expect(computeRead(lopsided).lean).toBeNull()
  })

  it('finds each mindset from answers placed on its own coordinates', () => {
    for (const id of MINDSET_IDS) {
      const read = computeRead(answersFor(id))
      expect(read.lean, `expected ${id}`).toBe(id)
    }
  })

  it('reports low confidence when two mindsets are equally close', () => {
    // Dead centre: no axis expresses anything, so several mindsets tie.
    const neutral: ScoredAnswer[] = AXIS_IDS.flatMap(axis =>
      Array.from({ length: 3 }, () => ({ axis, direction: 1 as const, score: 3 })),
    )
    const read = computeRead(neutral)
    expect(read.lean).not.toBeNull()
    expect(read.confidence).toBe('early')
  })

  it('only reaches "clear" with both a wide margin and real volume', () => {
    const read = computeRead(answersFor('manifestor', 5)) // 20 answers, far corner
    expect(read.lean).toBe('manifestor')
    expect(read.confidence).toBe('clear')

    // Same position, too few answers to be sure of it.
    const thin = computeRead(answersFor('manifestor', 2)) // 8 answers
    expect(thin.lean).toBe('manifestor')
    expect(thin.confidence).not.toBe('clear')
  })

  it('tracks completeness and per-axis coverage', () => {
    const read = computeRead(answersFor('stoic', 2)) // 8 answers, 2 per axis
    expect(read.answered).toBe(8)
    expect(read.completeness).toBeCloseTo(8 / 40)
    for (const axis of AXIS_IDS) expect(read.coverage[axis]).toBe(2)
  })
})

describe('assessment item bank', () => {
  it('has unique ids', () => {
    const ids = ASSESSMENT_ITEMS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers every axis evenly', () => {
    for (const axis of AXIS_IDS) {
      const forAxis = ASSESSMENT_ITEMS.filter(i => i.axis === axis)
      expect(forAxis.length, axis).toBe(10)
      // Both directions present, or the axis can only ever be agreed upward.
      expect(forAxis.some(i => i.direction === 1), `${axis} needs +1 items`).toBe(true)
      expect(forAxis.some(i => i.direction === -1), `${axis} needs -1 items`).toBe(true)
    }
  })

  it('states, never asks — a question does not take a scale', () => {
    for (const item of ASSESSMENT_ITEMS) {
      expect(item.text.endsWith('?'), item.id).toBe(false)
      expect(item.text.endsWith('.'), item.id).toBe(true)
    }
  })

  it('every id resolves back to its item', () => {
    for (const item of ASSESSMENT_ITEMS) {
      expect(ITEMS_BY_ID.get(item.id)).toBe(item)
    }
  })

  it('offers a 5-point scale', () => {
    expect(SCALE.map(s => s.score)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('picking the next item', () => {
  it('feeds the thinnest axis first, so a read arrives sooner', () => {
    // Everything known except faith — the next item should be a faith item.
    const coverage: Record<AxisId, number> = { agency: 4, discipline: 4, inquiry: 4, faith: 0 }
    for (let i = 0; i < 20; i++) {
      const item = pickNextItem(new Set(), coverage, [], () => i / 20)
      expect(item?.axis).toBe('faith')
    }
  })

  it('never repeats an item still inside its cooldown', () => {
    const answered = new Set(ASSESSMENT_ITEMS.filter(i => i.axis === 'agency').map(i => i.id))
    for (let i = 0; i < 20; i++) {
      const item = pickNextItem(answered, empty, [], () => i / 20)
      expect(answered.has(item!.id)).toBe(false)
    }
  })

  it('keeps going once the whole bank is cooling, re-asking the oldest first', () => {
    // The original bug: 40 items against a 120-day cooldown meant a daily
    // answerer emptied the bank in ~6 weeks and then got NOTHING for ~11
    // weeks. It never errored, it just silently stopped appearing.
    const all = new Set(ASSESSMENT_ITEMS.map(i => i.id))
    const staleFirst = ['fa07', 'in03', 'ag01']
    const item = pickNextItem(all, empty, staleFirst)
    expect(item).not.toBeNull()
    expect(item!.id).toBe('fa07')
  })

  it('still returns something when everything is cooling and nothing is stale-ranked', () => {
    const all = new Set(ASSESSMENT_ITEMS.map(i => i.id))
    expect(pickNextItem(all, empty, [])).not.toBeNull()
  })

  it('ignores stale ids that are no longer in the bank', () => {
    const all = new Set(ASSESSMENT_ITEMS.map(i => i.id))
    // An item retired since the user answered it must not strand the picker.
    const item = pickNextItem(all, empty, ['retired-item-id', 'di05'])
    expect(item!.id).toBe('di05')
  })

  it('spreads a run across the axes instead of hammering the thinnest one', () => {
    // The naive version — pickNextItem called N times — would return the
    // same starving axis every time, because coverage never advances. A run
    // of eight all about willpower leaves the user exactly where they began:
    // still no read, because a read needs every axis heard from.
    const seq = pickSequence(8, new Set(), empty)
    expect(seq).toHaveLength(8)
    const axes = new Set(seq.map(i => i.axis))
    expect(axes.size).toBe(4)
  })

  it('never repeats an item within a single run', () => {
    const seq = pickSequence(12, new Set(), empty)
    expect(new Set(seq.map(i => i.id)).size).toBe(seq.length)
  })

  it('stops early rather than padding when the bank runs short', () => {
    const nearlyAll = new Set(ASSESSMENT_ITEMS.slice(0, 38).map(i => i.id))
    const seq = pickSequence(10, nearlyAll, empty)
    expect(seq.length).toBeLessThanOrEqual(2)
    expect(seq.every(i => !nearlyAll.has(i.id))).toBe(true)
  })

  it('keeps the cooldown within a sane multiple of the bank size', () => {
    // A daily answerer empties the bank in ASSESSMENT_ITEMS.length days, so
    // the fallback carries the gap between that and the cooldown. It should
    // be a short gap, not a season: at 120 days against 40 items the fallback
    // was doing ALL the work for eleven weeks, which is how the feature
    // silently disappeared. Grow the bank and this can grow with it.
    expect(RE_ASK_AFTER_DAYS).toBeGreaterThan(ASSESSMENT_ITEMS.length)
    expect(RE_ASK_AFTER_DAYS).toBeLessThanOrEqual(ASSESSMENT_ITEMS.length * 2)
  })
})
