import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { getSessionImage, getSessionThumb } from '../daily-guide/session-art'

const SESSIONS = ['morning_prime', 'midday_reset', 'wind_down', 'bedtime_story'] as const

describe('session art', () => {
  it('every image the rotation can pick has a committed full image and thumbnail', () => {
    // 60 consecutive days covers every slot of every pool.
    for (const s of SESSIONS) {
      for (let d = 0; d < 60; d++) {
        const date = new Date(Date.UTC(2026, 0, 1 + d))
        expect(existsSync(`public${getSessionImage(s, date)}`), `${s} day ${d}`).toBe(true)
        expect(existsSync(`public${getSessionThumb(s, date)}`), `${s} thumb day ${d}`).toBe(true)
      }
    }
  })
})
