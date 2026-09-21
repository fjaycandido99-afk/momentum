import { describe, it, expect } from 'vitest'
import {
  PLAN_MAX_ITEMS,
  PLAN_MAX_ITEM_LENGTH,
  PLAN_MAX_DETAIL_LENGTH,
  cleanPlan,
  hasPlan,
  parsePlan,
  planCopy,
  planFor,
  slotForToday,
  slotsFor,
  PLAN_COPY,
} from '@/lib/practices/plan'
import { rotationCue, SPLIT_ROTATIONS, sessionForDomain } from '@/lib/practices/cues'
import { DOMAINS, PRACTICE_PRESETS } from '@/lib/practices/presets'

const ppl = { presetKey: 'gym_ppl', days: [1, 2, 4, 5] }
const fullBody = { presetKey: 'gym_full_body_3', days: [1, 3, 5] }
const everyDay = { presetKey: 'read_pages', days: [] }

describe('slotsFor', () => {
  it('uses the rotation the preset names', () => {
    expect(slotsFor(ppl).map(s => s.label)).toEqual(['Push', 'Pull', 'Legs'])
  })

  it('uses the scheduled days when there is no rotation', () => {
    expect(slotsFor(fullBody).map(s => s.label)).toEqual(['Monday', 'Wednesday', 'Friday'])
  })

  it('gives an every-day practice one slot, not seven', () => {
    // Seven identical lists is a chore nobody fills in.
    expect(slotsFor(everyDay)).toEqual([{ key: 'any', label: 'Every day' }])
  })
})

describe('slotForToday', () => {
  it('advances a rotation by sessions kept, not by date', () => {
    // Miss Monday's push and Wednesday is still push.
    expect(slotForToday(ppl, '2026-09-21', 0)?.label).toBe('Push')
    expect(slotForToday(ppl, '2026-09-23', 0)?.label).toBe('Push')
    expect(slotForToday(ppl, '2026-09-23', 1)?.label).toBe('Pull')
    expect(slotForToday(ppl, '2026-09-23', 2)?.label).toBe('Legs')
    expect(slotForToday(ppl, '2026-09-23', 3)?.label).toBe('Push')
  })

  it('picks the weekday slot for a day-based practice', () => {
    expect(slotForToday(fullBody, '2026-09-21', 0)?.label).toBe('Monday') // Monday
    expect(slotForToday(fullBody, '2026-09-23', 0)?.label).toBe('Wednesday')
  })

  it('returns nothing on a day the practice is not due', () => {
    expect(slotForToday(fullBody, '2026-09-22', 0)).toBeNull() // Tuesday
  })

  it('always has a slot for an every-day practice', () => {
    expect(slotForToday(everyDay, '2026-09-22', 0)?.key).toBe('any')
  })
})

describe('rotationCue', () => {
  it('only names a rotation the preset itself defines', () => {
    expect(rotationCue('gym_ppl', 0)).toBe('Push')
    expect(rotationCue('gym_upper_lower', 1)).toBe('Lower')
    // No agreed rotation for these, so Voxu says nothing rather than guessing.
    expect(rotationCue('gym_five_day', 0)).toBeNull()
    expect(rotationCue('gym_powerlifting', 0)).toBeNull()
    expect(rotationCue('read_pages', 0)).toBeNull()
  })

  it('every rotation it does define comes from a real preset', () => {
    const keys = new Set(PRACTICE_PRESETS.map(p => p.key))
    for (const key of Object.keys(SPLIT_ROTATIONS)) expect(keys.has(key), key).toBe(true)
  })
})

describe('sessionForDomain', () => {
  it('offers a Voxu session only where Voxu has one', () => {
    expect(sessionForDomain('mind')).toBe('breathing_reset_60')
    expect(sessionForDomain('work')).toBe('sprint_20')
    // Voxu has no books and writes no training programmes.
    expect(sessionForDomain('read')).toBeNull()
    expect(sessionForDomain('gym')).toBeNull()
    expect(sessionForDomain('run')).toBeNull()
  })
})

describe('cleanPlan', () => {
  it('keeps their lines, trimmed', () => {
    const plan = cleanPlan({ push: ['  Lat pulldown ', 'Squat'] }, ppl)
    expect(plan).toEqual({
      push: { items: [{ name: 'Lat pulldown' }, { name: 'Squat' }] },
    })
  })

  it('drops slots this practice does not have', () => {
    const plan = cleanPlan({ push: ['Bench'], tuesday: ['Nope'], legs: ['Squat'] }, ppl)
    expect(Object.keys(plan).sort()).toEqual(['legs', 'push'])
  })

  it('drops blank rows and empty slots', () => {
    expect(cleanPlan({ push: ['', '   '], pull: ['Rows'] }, ppl)).toEqual({
      pull: { items: [{ name: 'Rows' }] },
    })
  })

  it('caps how much can be written', () => {
    const many = Array.from({ length: 30 }, (_, i) => `Exercise ${i}`)
    const long = 'x'.repeat(200)
    const plan = cleanPlan({ push: [...many, long] }, ppl)
    expect(plan.push.items).toHaveLength(PLAN_MAX_ITEMS)
    const longPlan = cleanPlan({ push: [long] }, ppl)
    expect(longPlan.push.items[0].name).toHaveLength(PLAN_MAX_ITEM_LENGTH)
  })

  it('survives nonsense without throwing', () => {
    expect(cleanPlan(null, ppl)).toEqual({})
    expect(cleanPlan('a string', ppl)).toEqual({})
    expect(cleanPlan(['an array'], ppl)).toEqual({})
    expect(cleanPlan({ push: 'not a list' }, ppl)).toEqual({})
    expect(cleanPlan({ push: [1, 2, null] }, ppl)).toEqual({})
  })

  it('takes a book for a reading practice', () => {
    expect(cleanPlan({ any: ['Rich Dad Poor Dad'] }, everyDay)).toEqual({
      any: { items: [{ name: 'Rich Dad Poor Dad' }] },
    })
  })
})

describe('rows and per-day minimums', () => {
  it('keeps the detail the user typed, and never interprets it', () => {
    const plan = cleanPlan({
      push: { items: [{ name: 'Bench press', detail: '3 x 8' }] },
    }, ppl)
    // Stored verbatim — no parsing of sets, reps or load anywhere.
    expect(plan.push.items[0]).toEqual({ name: 'Bench press', detail: '3 x 8' })
  })

  it('drops a detail with no exercise, and a blank detail', () => {
    const plan = cleanPlan({
      push: { items: [{ name: '', detail: '3 x 8' }, { name: 'Row', detail: '  ' }] },
    }, ppl)
    expect(plan.push.items).toEqual([{ name: 'Row' }])
  })

  it('caps the detail shorter than the name', () => {
    const plan = cleanPlan({
      push: { items: [{ name: 'Squat', detail: 'y'.repeat(200) }] },
    }, ppl)
    expect(plan.push.items[0].detail).toHaveLength(PLAN_MAX_DETAIL_LENGTH)
  })

  it('takes a minimum for one day', () => {
    const plan = cleanPlan({
      push: { items: [{ name: 'Bench' }], minimum: 'First 2 exercises' },
    }, ppl)
    expect(plan.push.minimum).toBe('First 2 exercises')
  })

  it('keeps a minimum even on a day with no rows yet', () => {
    // Somebody may set the floor before writing the session.
    const plan = cleanPlan({ push: { items: [], minimum: '20 minutes counts' } }, ppl)
    expect(plan.push).toEqual({ items: [], minimum: '20 minutes counts' })
  })
})

describe('parsePlan and planFor', () => {
  it('reads a stored plan back', () => {
    const plan = parsePlan({ push: { items: [{ name: 'Bench' }] }, junk: 'no' })
    expect(plan).toEqual({ push: { items: [{ name: 'Bench' }] } })
  })

  it('still reads the plans stored before rows existed', () => {
    // The first version stored { mon: ["Squat", "Bench"] }. Those rows are
    // on real accounts; a shape change must not erase somebody's plan.
    const plan = parsePlan({ push: ['Squat', 'Bench'] })
    expect(plan).toEqual({
      push: { items: [{ name: 'Squat' }, { name: 'Bench' }] },
    })
  })

  it('treats anything unusable as no plan', () => {
    expect(parsePlan(null)).toBeNull()
    expect(parsePlan({})).toBeNull()
    expect(parsePlan({ push: [] })).toBeNull()
    expect(parsePlan({ push: { items: [] } })).toBeNull()
    expect(parsePlan('x')).toBeNull()
  })

  it('finds today\u2019s slot, and copes with neither existing', () => {
    const plan = { pull: { items: [{ name: 'Rows' }] } }
    expect(planFor(plan, { key: 'pull', label: 'Pull' })?.items).toEqual([{ name: 'Rows' }])
    expect(planFor(plan, { key: 'push', label: 'Push' })).toBeNull()
    expect(planFor(plan, null)).toBeNull()
    expect(planFor(null, { key: 'pull', label: 'Pull' })).toBeNull()
  })

  it('knows whether anything is written down', () => {
    expect(hasPlan({ pull: { items: [{ name: 'Rows' }] } })).toBe(true)
    expect(hasPlan({ pull: { items: [] } })).toBe(false)
    expect(hasPlan(null)).toBe(false)
  })
})

describe('planCopy', () => {
  it('asks each domain for the right thing', () => {
    expect(planCopy('gym').ask).toContain('do that day')
    expect(planCopy('run').placeholder).toBe('4 miles in an hour')
    expect(planCopy('read').ask).toBe('What are you reading?')
    expect(planCopy('read').placeholder).toBe('Rich Dad Poor Dad')
  })

  it('has copy for every domain in the picker', () => {
    for (const d of DOMAINS) {
      const copy = PLAN_COPY[d.id]
      expect(copy, d.id).toBeTruthy()
      expect(copy.placeholder.length, d.id).toBeGreaterThan(3)
    }
  })

  it('falls back rather than breaking on an unknown domain', () => {
    expect(planCopy(undefined).ask.length).toBeGreaterThan(3)
    expect(planCopy('made_up').ask).toBe(PLAN_COPY.custom.ask)
  })
})

describe('the builder copy', () => {
  it('asks each domain for a row in its own language', () => {
    for (const d of DOMAINS) {
      const copy = planCopy(d.id)
      expect(copy.rowPlaceholder.length, d.id).toBeGreaterThan(2)
      expect(copy.detailPlaceholder.length, d.id).toBeGreaterThan(1)
      expect(typeof copy.showsDetail, d.id).toBe('boolean')
    }
  })

  it('gives the gym a set-shaped example and reading a book', () => {
    expect(planCopy('gym').rowPlaceholder).toBe('Squat')
    expect(planCopy('gym').detailPlaceholder).toBe('3 x 8')
    expect(planCopy('read').rowPlaceholder).toBe('Rich Dad Poor Dad')
  })
})
