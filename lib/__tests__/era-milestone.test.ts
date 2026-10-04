import { describe, it, expect } from 'vitest'
import { nextMilestone } from '@/lib/era/milestone'

const base = { day: 10, lengthDays: 30, phaseIndex: 2, phaseLabel: 'Building', dayInPhase: 3, phaseDays: 7, keptRun: 0 }

describe('nextMilestone', () => {
  it('names the nearest real milestone, within three days', () => {
    expect(nextMilestone({ ...base, keptRun: 4 })).toBe("They've kept 4 promises in a row; 5 would take 1 more.")
    expect(nextMilestone({ ...base, dayInPhase: 6 })).toBe('Chapter 2 (Building) ends tomorrow; chapter 3 starts on day 12.')
    expect(nextMilestone({ ...base, day: 28, phaseIndex: 4, dayInPhase: 6, phaseDays: 8 })).toBe('Day 30, the last day of this era, is in 2 days.')
  })
  it('says nothing when nothing is close, and never invents a number', () => {
    expect(nextMilestone(base)).toBeNull()
    expect(nextMilestone({ ...base, keptRun: 31 })).toBeNull()
  })
})
