import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { ERA_PRESETS, CUSTOM_ERA_KEY } from '../era/presets'
import { ERA_PROGRAMS, programFor } from '../era/programs'
import { ERA_MISSIONS } from '../era/missions'
import { eraStage, missionForDay } from '../era/logic'

const ALL_KEYS = [...ERA_PRESETS.map(p => p.key), CUSTOM_ERA_KEY]

// Read ids out of the component sources rather than importing them: those
// modules pull in React and icon libraries a unit test doesn't need.
const soundscapeIds = [...readFileSync('components/player/SoundscapePlayer.tsx', 'utf8').matchAll(/\{ id: '([a-z_]+)', label:/g)].map(m => m[1])
const guideIds = [...readFileSync('components/home/home-types.ts', 'utf8').matchAll(/\{ id: '([a-z_]+)', name:/g)].map(m => m[1])

describe('era programs', () => {
  it('every era has a program, and unknown keys fall back to custom', () => {
    for (const k of ALL_KEYS) expect(ERA_PROGRAMS[k], k).toBeTruthy()
    expect(programFor('no_such_era')).toBe(ERA_PROGRAMS.custom)
  })

  it('points only at hero images that are actually committed', () => {
    for (const k of ALL_KEYS) {
      const img = ERA_PROGRAMS[k].image
      if (!img) continue
      expect(img, k).toMatch(/^\/era\/[a-z0-9_]+\.(jpg|webp)$/)
      // A missing file would render a broken image in the hero.
      expect(existsSync(`public${img}`), `${k}: public${img}`).toBe(true)
    }
  })

  it('links only to content that exists in the app', () => {
    expect(soundscapeIds.length).toBeGreaterThan(5)
    expect(guideIds.length).toBeGreaterThan(5)
    for (const k of ALL_KEYS) {
      expect(soundscapeIds, `${k} soundscape`).toContain(ERA_PROGRAMS[k].soundscapeId)
      expect(guideIds, `${k} guide`).toContain(ERA_PROGRAMS[k].guideId)
    }
  })
})

describe('era missions', () => {
  it('every era has exactly 30 missions, each short enough for the card', () => {
    for (const k of ALL_KEYS) {
      const bank = ERA_MISSIONS[k]
      expect(bank, k).toBeTruthy()
      expect(bank.length, k).toBe(30)
      for (const m of bank) {
        expect(m.trim().length, `${k}: "${m}"`).toBeGreaterThan(0)
        expect(m.length, `${k}: "${m}"`).toBeLessThanOrEqual(70)
      }
      expect(new Set(bank).size, `${k} has duplicates`).toBe(30)
    }
  })

  it('day 1 is the first mission and it wraps past the end', () => {
    expect(missionForDay(['a', 'b', 'c'], 1)).toBe('a')
    expect(missionForDay(['a', 'b', 'c'], 3)).toBe('c')
    expect(missionForDay(['a', 'b', 'c'], 4)).toBe('a')
    expect(missionForDay([], 1)).toBeNull()
    expect(missionForDay(undefined, 1)).toBeNull()
  })
})

describe('eraStage', () => {
  it('splits a 30-day era by week: 1–7, 8–14, 15–21, 22–30', () => {
    const at = (d: number) => eraStage(d, 30).key
    expect([at(1), at(7)]).toEqual(['starting', 'starting'])
    expect([at(8), at(14)]).toEqual(['building', 'building'])
    expect([at(15), at(21)]).toEqual(['maintaining', 'maintaining'])
    expect([at(22), at(30)]).toEqual(['becoming', 'becoming'])
  })

  it('clamps out-of-range days instead of throwing', () => {
    expect(eraStage(0, 30).key).toBe('starting')
    expect(eraStage(45, 30).key).toBe('becoming')
  })
})
