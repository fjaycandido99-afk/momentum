import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { eraImageFor, programFor } from '@/lib/era/programs'

describe('era art by chapter', () => {
  const gym = programFor('gym_arc')

  it('shows Gym Arc a different picture each chapter', () => {
    const pics = [1, 2, 3, 4].map(c => eraImageFor(gym, c))
    expect(new Set(pics).size).toBe(4)
  })

  it('points only at files that are on disk', () => {
    for (const c of [1, 2, 3, 4]) {
      const p = eraImageFor(gym, c)!
      expect(fs.existsSync(path.join(process.cwd(), 'public', p)), p).toBe(true)
    }
  })

  it('keeps an era without stage art on its one picture', () => {
    const locked = programFor('locked_in')
    expect(eraImageFor(locked, 1)).toBe(eraImageFor(locked, 4))
  })

  it('clamps anything outside 1–4 rather than showing nothing', () => {
    expect(eraImageFor(gym, 0)).toBe(eraImageFor(gym, 1))
    expect(eraImageFor(gym, 9)).toBe(eraImageFor(gym, 4))
  })
})
