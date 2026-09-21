import { describe, it, expect } from 'vitest'
import {
  LOOP_SEQUENCE,
  loopCopy,
  loopProgress,
  loopStep,
  stateAdvice,
  type LoopStep,
} from '@/lib/era/day-loop'
import { CHECK_IN_FROM_HOUR } from '@/lib/era/logic'

const base = {
  hour: 9,
  eraStep: 'promise' as const,
  wantsState: false,
  hasState: false,
  hasTomorrow: false,
}

describe('loopStep', () => {
  it('asks for the promise when there isn’t one', () => {
    expect(loopStep(base)).toBe('promise')
  })

  it('leaves the day alone between promising and the evening', () => {
    expect(loopStep({ ...base, eraStep: 'check', hour: 11 })).toBe('act')
  })

  it('asks for the answer from the check-in hour', () => {
    expect(loopStep({ ...base, eraStep: 'check', hour: CHECK_IN_FROM_HOUR - 1 })).toBe('act')
    expect(loopStep({ ...base, eraStep: 'check', hour: CHECK_IN_FROM_HOUR })).toBe('check')
    expect(loopStep({ ...base, eraStep: 'check', hour: 22 })).toBe('check')
  })

  it('ends the day by setting up tomorrow, then says it is ready', () => {
    expect(loopStep({ ...base, eraStep: 'done', hour: 21 })).toBe('prepare')
    expect(loopStep({ ...base, eraStep: 'done', hour: 21, hasTomorrow: true })).toBe('ready')
  })

  it('puts an unanswered yesterday ahead of everything', () => {
    expect(loopStep({
      ...base,
      eraStep: 'check_yesterday',
      wantsState: true,
      hasState: false,
      hour: 8,
    })).toBe('check_yesterday')
  })

  it('shows the era as complete once the days are done', () => {
    expect(loopStep({ ...base, eraStep: 'complete' })).toBe('complete')
  })

  describe('the state check', () => {
    it('comes first in the morning for someone who turned it on', () => {
      expect(loopStep({ ...base, wantsState: true, hour: 7 })).toBe('state')
    })

    it('is never a step for someone who did not', () => {
      // It must never be used to nag for consent.
      expect(loopStep({ ...base, wantsState: false, hour: 7 })).toBe('promise')
    })

    it('stops being the question in the afternoon', () => {
      expect(loopStep({ ...base, wantsState: true, hour: 16 })).toBe('promise')
    })

    it('is skipped once it is done', () => {
      expect(loopStep({ ...base, wantsState: true, hasState: true, hour: 7 })).toBe('promise')
    })
  })
})

describe('loopProgress', () => {
  it('counts four steps without the state check, five with it', () => {
    expect(loopProgress('promise', false).of).toBe(4)
    expect(loopProgress('promise', true).of).toBe(5)
    expect(LOOP_SEQUENCE).toHaveLength(5)
  })

  it('walks through the day', () => {
    expect(loopProgress('state', true).index).toBe(1)
    expect(loopProgress('promise', true).index).toBe(2)
    expect(loopProgress('act', true).index).toBe(3)
    expect(loopProgress('check', true).index).toBe(4)
    expect(loopProgress('prepare', true).index).toBe(5)
  })

  it('reads as finished when the day is done', () => {
    expect(loopProgress('ready', true)).toEqual({ index: 5, of: 5 })
    expect(loopProgress('ready', false)).toEqual({ index: 4, of: 4 })
  })

  it('does not place yesterday’s leftover inside today', () => {
    expect(loopProgress('check_yesterday', true).index).toBe(0)
  })
})

describe('loopCopy', () => {
  it('gives one instruction for every step', () => {
    const steps: LoopStep[] = [
      'state', 'promise', 'act', 'check', 'check_yesterday', 'prepare', 'ready', 'complete',
    ]
    for (const step of steps) {
      const copy = loopCopy(step)
      expect(copy.label.length, step).toBeGreaterThan(2)
      expect(copy.line.length, step).toBeGreaterThan(8)
    }
  })

  it('closes the loop by naming tomorrow', () => {
    expect(loopCopy('ready').line).toBe('Tomorrow is ready.')
  })
})

describe('stateAdvice', () => {
  it('says nothing without a check-in', () => {
    expect(stateAdvice(null)).toBeNull()
    expect(stateAdvice({})).toBeNull()
  })

  it('shrinks the ask when they said they are low', () => {
    expect(stateAdvice({ energy: 1 })).toContain('smallest version')
    expect(stateAdvice({ rested: 2 })).toContain('smallest version')
  })

  it('suggests one thing when they said it feels heavy', () => {
    expect(stateAdvice({ stress: 5 })).toContain('let the rest wait')
  })

  it('points at the harder thing on a good day', () => {
    expect(stateAdvice({ energy: 5, mood: 5 })).toContain('harder one')
  })

  it('stays quiet on an ordinary day', () => {
    expect(stateAdvice({ energy: 3, mood: 3, stress: 3, rested: 3 })).toBeNull()
  })
})
