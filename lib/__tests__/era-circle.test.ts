import { describe, expect, it } from 'vitest'
import {
  circleLine,
  CIRCLE_MAX,
  firstName,
  shapeCircle,
  shapeTrending,
  TRENDING_MIN_PEOPLE,
  type CircleMemberInput,
} from '../era/circle'

const member = (over: Partial<CircleMemberInput> & { userId: string }): CircleMemberInput => ({
  name: 'Marco Diaz',
  direction: 'joined_you',
  joinedAt: new Date('2026-09-01T00:00:00Z'),
  era: { title: 'Locked In', key: 'locked_in', day: 4, lengthDays: 30, streak: 4 },
  visible: true,
  ...over,
})

describe('trending', () => {
  it('shows nothing until the counts are real', () => {
    // Voxu's actual numbers when this shipped: 13 users, no eras.
    expect(shapeTrending([{ key: 'locked_in', people: 3 }, { key: 'discipline', people: 1 }])).toEqual([])
    expect(shapeTrending([])).toEqual([])
    expect(shapeTrending([{ key: 'locked_in', people: TRENDING_MIN_PEOPLE - 1 }])).toEqual([])
  })

  it('lists eras that cleared the bar, biggest first, ties alphabetical', () => {
    const out = shapeTrending([
      { key: 'study', people: 60 },
      { key: 'locked_in', people: 900 },
      { key: 'gym_arc', people: 60 },
      { key: 'confidence', people: 12 },
    ])
    expect(out.map(e => `${e.title}:${e.people}`)).toEqual(['Locked In:900', 'Gym Arc:60', 'Study Era:60'])
  })

  it('never lists a custom era, whatever its count', () => {
    expect(shapeTrending([{ key: 'custom', people: 5000 }])).toEqual([])
    expect(shapeTrending([{ key: 'not_an_era', people: 5000 }])).toEqual([])
  })
})

describe('circle', () => {
  it('shows a first name, the era and how far in — and nothing else', () => {
    const [row] = shapeCircle([member({ userId: 'u1' })])
    expect(row).toEqual({
      name: 'Marco',
      direction: 'joined_you',
      era: { title: 'Locked In', key: 'locked_in', day: 4, lengthDays: 30, streak: 4 },
    })
    expect(Object.keys(row)).toEqual(['name', 'direction', 'era'])
  })

  it('leaves out anyone who chose not to appear', () => {
    const out = shapeCircle([member({ userId: 'u1', visible: false }), member({ userId: 'u2', name: 'Ana' })])
    expect(out.map(m => m.name)).toEqual(['Ana'])
  })

  it('puts people still in an era first, then furthest in, then newest', () => {
    const out = shapeCircle([
      member({ userId: 'done', name: 'Zed', era: null, joinedAt: new Date('2026-09-10T00:00:00Z') }),
      member({ userId: 'new', name: 'Ana', era: { title: 'Study Era', key: 'study', day: 2, lengthDays: 30, streak: 2 }, joinedAt: new Date('2026-09-12T00:00:00Z') }),
      member({ userId: 'deep', name: 'Bo', era: { title: 'Locked In', key: 'locked_in', day: 19, lengthDays: 30, streak: 6 } }),
    ])
    expect(out.map(m => m.name)).toEqual(['Bo', 'Ana', 'Zed'])
  })

  it('stays a circle', () => {
    const many = Array.from({ length: CIRCLE_MAX + 20 }, (_, i) => member({ userId: `u${i}` }))
    expect(shapeCircle(many)).toHaveLength(CIRCLE_MAX)
  })

  it('never leaks a full name or an email as a name', () => {
    expect(firstName('Francis Candido')).toBe('Francis')
    expect(firstName('fjay@example.com')).toBe('Someone')
    expect(firstName(null)).toBe('Someone')
    expect(firstName('   ')).toBe('Someone')
  })

  it('counts plainly, and says so when empty', () => {
    expect(circleLine([])).toBe('Nobody has joined your era yet.')
    expect(circleLine(shapeCircle([member({ userId: 'u1' })]))).toBe('1 in your circle · 1 in an era')
    expect(circleLine(shapeCircle([member({ userId: 'u1', era: null })]))).toBe('1 in your circle · nobody in an era right now')
  })
})
