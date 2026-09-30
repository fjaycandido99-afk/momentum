import { describe, it, expect } from 'vitest'
import { buildDebrief, listOf, DEBRIEF_MAX } from '@/lib/pulse/debrief'
import type { TodayItem } from '@/lib/pulse/engine'

const item = (kind: TodayItem['kind'], title: string, status: TodayItem['status']): TodayItem => ({
  key: `${kind}-${title}`, kind, title, time: null, status, target: null,
})

describe('night debrief', () => {
  it('closes a good day plainly', () => {
    const s = buildDebrief({
      era: { title: 'Locked In', day: 14 },
      items: [item('promise', 'Today’s promise', 'kept'), item('discipline', 'Read 10 pages', 'done'), item('discipline', 'Gym', 'minimum'), item('mission', 'Today’s mission', 'done')],
      tomorrowReady: true,
    })
    expect(s).toBe(
      "Day 14 of Locked In is nearly done. You kept your promise. You did Read 10 pages. Gym at the minimum. That counts. And you did the mission. Tomorrow's promise is set. You're done for tonight.",
    )
  })

  it('says a miss once, and that there is nothing to make up', () => {
    const s = buildDebrief({ era: null, items: [item('discipline', 'Gym', 'missed')], tomorrowReady: false })
    expect(s).toContain("Gym didn't happen today. Nothing to make up tomorrow.")
    expect(s).not.toMatch(/streak|fail|should have|try harder|disappoint/i)
  })

  it('never claims a promise it was not told about', () => {
    const s = buildDebrief({ era: null, items: [item('promise', 'Today’s promise', 'open')], tomorrowReady: false })
    expect(s).toContain("You haven't said yet whether you kept your promise.")
    expect(s).not.toContain('You kept')
  })

  it('says nothing about a promise that was never made', () => {
    const s = buildDebrief({ era: null, items: [item('promise', 'Make today’s promise', 'open')], tomorrowReady: false })
    expect(s).not.toContain('kept your promise')
    expect(s).not.toContain("haven't said")
  })

  it('points at tomorrow when it is not set yet', () => {
    expect(buildDebrief({ era: null, items: [], tomorrowReady: false })).toContain("Write tomorrow's promise")
  })

  it('stays under the voice cap, dropping the least important first', () => {
    const many = Array.from({ length: 30 }, (_, i) => item('discipline', `A fairly long discipline name ${i}`, i % 2 ? 'missed' : 'due'))
    const s = buildDebrief({ era: { title: 'Locked In', day: 3 }, items: many, tomorrowReady: true })
    expect(s.length).toBeLessThanOrEqual(DEBRIEF_MAX)
    expect(s).toContain("You're done for tonight")
  })

  it('lists like a person', () => {
    expect(listOf(['A'])).toBe('A')
    expect(listOf(['A', 'B'])).toBe('A and B')
    expect(listOf(['A', 'B', 'C'])).toBe('A, B and C')
  })
})
