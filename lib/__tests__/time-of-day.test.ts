import { describe, it, expect } from 'vitest'
import { dayPhase, sceneFor } from '@/lib/home/time-of-day'
import { GUIDED_SCENE, PHASE_SCENES } from '@/lib/home/scenes'

describe('home time of day', () => {
  it('splits a summer clock into sunrise, sunset and night', () => {
    const JUNE = 5
    expect(dayPhase(4, JUNE)).toBe('night')
    expect(dayPhase(5, JUNE)).toBe('sunrise')
    expect(dayPhase(11, JUNE)).toBe('sunrise')
    expect(dayPhase(12, JUNE)).toBe('sunset')
    expect(dayPhase(19, JUNE)).toBe('sunset')
    expect(dayPhase(20, JUNE)).toBe('night')
    expect(dayPhase(0, JUNE)).toBe('night')
  })

  it('lets night fall earlier as the year darkens', () => {
    const OCTOBER = 9, DECEMBER = 11
    // 7pm in October is after dark — the bug that showed a sunset sky.
    expect(dayPhase(19, OCTOBER)).toBe('night')
    expect(dayPhase(17, OCTOBER)).toBe('sunset')
    expect(dayPhase(17, DECEMBER)).toBe('night')
    // and the winter morning stays dark until six
    expect(dayPhase(5, DECEMBER)).toBe('night')
    expect(dayPhase(6, DECEMBER)).toBe('sunrise')
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
    for (const s of [...Object.values(PHASE_SCENES), GUIDED_SCENE]) {
      expect(!!s.tall).toBe(!!s.wide)
    }
  })
})
