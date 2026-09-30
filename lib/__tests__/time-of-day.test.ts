import { describe, it, expect } from 'vitest'
import { dayPhase, sceneFor } from '@/lib/home/time-of-day'
import { PHASE_SCENES } from '@/lib/home/scenes'

describe('home time of day', () => {
  it('splits the clock into sunrise, sunset and night', () => {
    expect(dayPhase(4)).toBe('night')
    expect(dayPhase(5)).toBe('sunrise')
    expect(dayPhase(11)).toBe('sunrise')
    expect(dayPhase(12)).toBe('sunset')
    expect(dayPhase(19)).toBe('sunset')
    expect(dayPhase(20)).toBe('night')
    expect(dayPhase(0)).toBe('night')
  })

  it('never leaves a phase without a sky: missing photos borrow sunset', () => {
    for (const p of ['sunrise', 'sunset', 'night'] as const) {
      const s = sceneFor(p, PHASE_SCENES)
      expect(s.tall).toBeTruthy()
      expect(s.wide).toBeTruthy()
      expect(s.hero).toBeTruthy()
    }
  })

  it('falls back per field, not per phase', () => {
    const scenes = {
      sunrise: { tall: '/a-tall.jpg', wide: null, hero: null },
      sunset: { tall: '/s-tall.jpg', wide: '/s-wide.jpg', hero: '/s-hero.jpg' },
      night: { tall: null, wide: null, hero: null },
    }
    expect(sceneFor('sunrise', scenes)).toEqual({ tall: '/a-tall.jpg', wide: '/s-wide.jpg', hero: '/s-hero.jpg' })
  })

  // iPad: a phase with a tall backdrop must have a wide one too, or iPad
  // landscape shows the tall one stretched soft.
  it('every backdrop that exists has both a tall and a wide photo', () => {
    for (const s of Object.values(PHASE_SCENES)) {
      expect(!!s.tall).toBe(!!s.wide)
    }
  })
})
