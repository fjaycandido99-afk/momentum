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
    const start = css.indexOf('── Era skins')
    const end = css.indexOf('── Scene theme', start)
    const block = css.slice(start, end > start ? end : undefined)
    expect(block).not.toMatch(/(^|[;{\s])color\s*:/m)
  })

  // The scene theme's blue may light a small label (the mockup's
  // "TODAY'S TRAINING"), never body text: the only text colours it sets are
  // the eyebrow's white and the eyebrow-glow class.
  it('scene theme colours only eyebrow labels', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
    const from = css.indexOf('── Scene theme')
    const to = css.indexOf('── Gold theme', from)
    const block = css.slice(from, to > from ? to : undefined)
    const rules = [...block.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter(([, , body]) => /(^|[;{\s])color\s*:/m.test(body))
      .map(([, sel]) => sel.trim())
    expect(rules).toEqual(['.scene-eyebrow', '.scene-eyebrow-glow'])
  })

  // Gold on the coach picker: the label and the one title word, nothing else.
  it('gold theme colours only its label and title', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')
    const block = css.slice(css.indexOf('── Gold theme'))
    const end = block.indexOf('.gold-tone {')
    const rules = [...block.slice(0, block.indexOf('}', end) + 1).matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter(([, , body]) => /(^|[;{\s])color\s*:/m.test(body))
      .map(([, sel]) => sel.trim().split('\n').pop()!.trim())
    expect(rules).toEqual(['.gold-eyebrow', '.gold-title'])
  })
})
