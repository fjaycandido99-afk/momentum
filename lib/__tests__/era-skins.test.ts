import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { ERA_SKINS, eraSkin, eraSkinVars, eraAccentHex } from '@/lib/era/skins'

const programs = fs.readFileSync(path.join(process.cwd(), 'lib/era/programs.ts'), 'utf8')
const eraKeys = [...programs.matchAll(/image: '\/era\/([a-z_]+)\.jpg'/g)].map(m => m[1])

const saturation = ([r, g, b]: number[]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255

describe('era skins', () => {
  it('found the eras to check', () => {
    expect(eraKeys.length).toBeGreaterThanOrEqual(9)
  })

  it('has a skin for every era', () => {
    for (const k of eraKeys) expect(ERA_SKINS[k], k).toBeDefined()
  })

  it('keeps Voxu monochrome except where the era IS a light', () => {
    // Colour only for Comeback's ember, Study's lamp and 5AM's dawn.
    const coloured = Object.entries(ERA_SKINS).filter(([, s]) => !s.mono).map(([k]) => k).sort()
    expect(coloured).toEqual(['comeback', 'five_am', 'study'])
    for (const [k, s] of Object.entries(ERA_SKINS)) {
      if (s.mono) expect(saturation(s.accent), k).toBeLessThan(0.12)
    }
  })

  it('falls back to plain white — Voxu as it was — with no era', () => {
    expect(eraSkin(null).accent).toEqual([255, 255, 255])
    expect(eraSkinVars(undefined)).toEqual({ '--era-accent': '255 255 255' })
    expect(eraAccentHex('nope')).toBe('#ffffff')
  })

  it('never colours text: the accent classes set fills, borders and shadows only', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
    const block = css.slice(css.indexOf('── Era skins'))
    expect(block).not.toMatch(/(^|[;{\s])color\s*:/m)
  })
})
