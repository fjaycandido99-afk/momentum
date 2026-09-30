import { describe, it, expect } from 'vitest'
import { startScript } from '@/lib/pulse/push'
import { buildPulse } from '@/lib/pulse/engine'

const DOMAINS = ['gym', 'run', 'read', 'study', 'work', 'mind', 'custom']

describe('talk me into it', () => {
  it('is identical for everyone with the same minimum — so the audio is cached once', () => {
    expect(startScript('gym', '30 minutes')).toBe(startScript('gym', '30 minutes'))
    expect(startScript('gym', '30 minutes ')).toBe(startScript('gym', '30 minutes.'))
  })

  it('asks for the minimum and one first step, never the full session', () => {
    const s = startScript('read', '10 pages')
    expect(s).toContain('Your minimum today is 10 pages.')
    expect(s).toContain('Decide after that.')
  })

  it('still works without a minimum or a known kind', () => {
    expect(startScript(null, '')).toContain('The smallest version counts.')
    expect(startScript('underwater-basket-weaving', '5 min')).toContain('smallest first step')
  })

  it('stays short, impersonal and guilt-free', () => {
    for (const d of DOMAINS) {
      const s = startScript(d, '30 minutes')
      expect(s.length).toBeLessThan(350)
      expect(s).not.toMatch(/miss|fail|streak|behind|should have|\{|\}/i)
    }
  })

  it('rides on Pulse for a due discipline', () => {
    const p = buildPulse({
      now: 600, weekday: 3, era: null, steps: [],
      practices: [{ id: 'g', label: 'Gym', domain: 'gym', state: 'due', todaysMinimum: '20 minutes', weakDay: null }],
    })
    expect(p.rightNow?.push).toBe(startScript('gym', '20 minutes'))
  })
})
