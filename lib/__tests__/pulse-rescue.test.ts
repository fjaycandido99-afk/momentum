import { describe, it, expect } from 'vitest'
import { rescuePlan, rescueScript, minutesIn } from '@/lib/pulse/rescue'
import type { PulseInput, PulsePractice } from '@/lib/pulse/engine'

const H = (h: number, m = 0) => h * 60 + m
const p = (id: string, min: string, state: PulsePractice['state'] = 'due'): PulsePractice =>
  ({ id, label: id, state, todaysMinimum: min, weakDay: null })
const input = (over: Partial<PulseInput>): PulseInput => ({ now: H(16), weekday: 3, era: null, practices: [], steps: [], ...over })

describe('rescue', () => {
  it('is offered after 3pm with two or more still due', () => {
    expect(rescuePlan(input({ practices: [p('Gym', '20 minutes'), p('Read', '5 pages')] }))?.steps).toHaveLength(2)
  })

  it('is not a rescue with only one thing open', () => {
    expect(rescuePlan(input({ practices: [p('Gym', '20 minutes'), p('Read', '5 pages', 'done')] }))).toBeNull()
  })

  it('waits for the afternoon — unless something has already slipped', () => {
    const two = [p('Gym', '20 minutes'), p('Read', '5 pages')]
    expect(rescuePlan(input({ now: H(10), practices: two }))).toBeNull()
    const slipped = rescuePlan(input({ now: H(10), practices: two, steps: [{ kind: 'practice', ref: 'Gym', label: null, time: '07:00' }] }))
    expect(slipped).not.toBeNull()
  })

  it('puts timed steps first, in clock order', () => {
    const plan = rescuePlan(input({
      practices: [p('Read', '5 pages'), p('Gym', '20 minutes'), p('Run', '10 minutes')],
      steps: [{ kind: 'x', ref: 'Run', label: null, time: '18:00' }, { kind: 'x', ref: 'Gym', label: null, time: '17:00' }],
    }))
    expect(plan?.steps.map(s => s.title)).toEqual(['Gym', 'Run', 'Read'])
  })

  it('gives a total only when every minimum is in minutes', () => {
    expect(rescuePlan(input({ practices: [p('Gym', '20 minutes'), p('Run', '1 hour')] }))?.minutes).toBe(80)
    expect(rescuePlan(input({ practices: [p('Gym', '20 minutes'), p('Read', '5 pages')] }))?.minutes).toBeNull()
  })

  it('asks for the smallest version where no minimum was written', () => {
    expect(rescuePlan(input({ practices: [p('Gym', ''), p('Read', '')] }))?.steps[0].ask).toBe('the smallest version')
  })

  it('reads minutes the way people write them', () => {
    expect(minutesIn('20 min')).toBe(20)
    expect(minutesIn('20m')).toBe(20)
    expect(minutesIn('1.5 hours')).toBe(90)
    expect(minutesIn('10 pages')).toBeNull()
  })

  it('never guilts, in writing or aloud', () => {
    const plan = rescuePlan(input({ practices: [p('Gym', '20 minutes'), p('Read', '5 pages')] }))!
    const all = `${plan.reason} ${rescueScript(plan)}`
    expect(all).toContain('Nothing is ruined')
    expect(all).not.toMatch(/fail|streak|behind you|should have|lazy/i)
    expect(rescueScript(plan).length).toBeLessThanOrEqual(560)
  })
})
