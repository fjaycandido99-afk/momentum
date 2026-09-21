import { describe, it, expect } from 'vitest'
import {
  RESET_STATES,
  deltaLine,
  exerciseForState,
  isResetState,
  parseLevel,
  resetState,
} from '@/lib/reset/states'
import { REGULATION_EXERCISES, exerciseSeconds } from '@/lib/exercises/library'

describe('the states', () => {
  it('says each one the way a person would', () => {
    expect(RESET_STATES).toHaveLength(4)
    for (const s of RESET_STATES) {
      expect(s.label.startsWith('I'), s.id).toBe(true)
      expect(s.recognise.length, s.id).toBeGreaterThan(20)
      expect(s.scale.labels).toHaveLength(5)
      expect(s.scale.question.endsWith('?'), s.id).toBe(true)
    }
  })

  it('routes every state to a real regulation session', () => {
    const regulation = new Set(REGULATION_EXERCISES.map(e => e.id))
    for (const s of RESET_STATES) {
      const exercise = exerciseForState(s.id)
      expect(exercise, s.id).toBeTruthy()
      expect(regulation.has(exercise!.id), s.id).toBe(true)
      // Short enough to be plausible for someone who is not coping.
      expect(exerciseSeconds(exercise!), s.id).toBeLessThanOrEqual(6 * 60)
    }
  })

  it('keeps the regulation sessions light — none of them is a push', () => {
    for (const e of REGULATION_EXERCISES) {
      expect(e.difficulty, e.id).toBe('light')
    }
  })

  it('recognises its own ids and nothing else', () => {
    expect(isResetState('overwhelmed')).toBe(true)
    expect(isResetState('sad')).toBe(false)
    expect(isResetState(null)).toBe(false)
    expect(resetState('wired')?.label).toContain('calm down')
    expect(resetState('nope')).toBeNull()
  })
})

describe('parseLevel', () => {
  it('takes 1 to 5 and nothing else', () => {
    expect(parseLevel(1)).toBe(1)
    expect(parseLevel(5)).toBe(5)
    expect(parseLevel(0)).toBeNull()
    expect(parseLevel(6)).toBeNull()
    expect(parseLevel(2.5)).toBeNull()
    expect(parseLevel('3')).toBe(3)
    expect(parseLevel(null)).toBeNull()
  })
})

describe('deltaLine', () => {
  const state = resetState('wired')!

  it('reports the two words they chose, and claims nothing else', () => {
    const line = deltaLine(state, 4, 2)
    expect(line).toContain(state.scale.labels[3])
    expect(line).toContain(state.scale.labels[1])
    // No percentages, and no claim that Voxu did it.
    expect(line).not.toMatch(/%|reduced|improved/i)
  })

  it('does not pretend a flat session moved', () => {
    expect(deltaLine(state, 3, 3)).toContain('Still')
  })

  it('says so when it went the other way', () => {
    // Being told it worked when it didn't is how someone stops believing it.
    expect(deltaLine(state, 2, 4)).toContain('doesn’t land')
  })

  it('still says something when they skipped the scale', () => {
    expect(deltaLine(state, null, null)).toContain('took the time')
    expect(deltaLine(state, 3, null)).toContain('took the time')
  })
})
