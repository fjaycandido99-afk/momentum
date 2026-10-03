import { describe, it, expect } from 'vitest'
import { easierPromise, fallbackPromise, GUIDED_TASTE, suggestEras, validateFirstMoment } from '@/lib/onboarding/first-launch'
import { ERA_PRESETS_BY_KEY } from '@/lib/era/presets'

describe('first launch', () => {
  it('suggests eras from their own words, always three, all real', () => {
    const s = suggestEras('I want to stop getting distracted and focus on my business')
    expect(s[0]).toBe('locked_in')
    expect(s).toHaveLength(3)
    for (const k of s) expect(ERA_PRESETS_BY_KEY.has(k)).toBe(true)
    expect(suggestEras('get back to the gym and lose weight')[0]).toBe('gym_arc')
    expect(suggestEras('zzz')).toEqual(['locked_in', 'discipline', 'comeback'])
  })

  it('only ever keeps eras from the preset list, whatever the model says', () => {
    const m = validateFirstMoment({ reply: 'Heard.', eras: ['made_up', 'study', 'gym_arc', 'study'], promise: 'I\'ll study for 20 minutes.' }, 'exams')
    expect(m.eras).toEqual(['study', 'gym_arc', expect.any(String)])
    expect(new Set(m.eras).size).toBe(3)
    for (const k of m.eras) expect(ERA_PRESETS_BY_KEY.has(k)).toBe(true)
  })

  it('always answers, even with nothing from the model', () => {
    const m = validateFirstMoment(null, 'I want to wake up earlier')
    expect(m.reply.length).toBeGreaterThan(10)
    expect(m.eras[0]).toBe('five_am')
    expect(m.promise).toBe(fallbackPromise('five_am'))
    expect(m.easier.length).toBeGreaterThan(5)
  })

  it('makes a promise easier by halving its minutes, never below five', () => {
    expect(easierPromise('I\'ll work on my business for 20 focused minutes.')).toBe('I\'ll work on my business for 10 focused minutes.')
    expect(easierPromise('I\'ll read for 6 min.')).toBe('I\'ll read for 5 min.')
    expect(easierPromise('I\'ll finish the thing before lunch.')).toBe('I\'ll start it for five minutes. That counts.')
  })

  it('keeps the guided taste short — about 30 to 45 seconds', () => {
    const ms = GUIDED_TASTE.reduce((t, l) => t + l.text.split(' ').length * 380 + l.pause, 0)
    expect(ms).toBeGreaterThan(25_000)
    expect(ms).toBeLessThan(50_000)
  })
})
