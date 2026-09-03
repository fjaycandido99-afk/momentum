import { describe, it, expect } from 'vitest'
import { MINDSET_CONFIGS, getMindsetConfig } from '../configs'
import { MINDSET_IDS } from '../types'
import type { MindsetId } from '../types'

describe('MINDSET_CONFIGS', () => {
  it('should have a config for every mindset ID', () => {
    for (const id of MINDSET_IDS) {
      expect(MINDSET_CONFIGS[id]).toBeDefined()
    }
  })

  it('has exactly one config per declared mindset, and no extras', () => {
    // Was `toHaveLength(6)`. Two mindsets (manifestor, hustler) were added
    // later and this was not, so the suite has been red ever since — which
    // means "tests pass" stopped being a signal anyone could act on.
    //
    // Asserting a hardcoded COUNT tests nothing useful: it fails when the
    // product legitimately grows, and it would still pass if a config were
    // swapped for a duplicate. What is worth pinning is that
    // MINDSET_CONFIGS and MINDSET_IDS agree in both directions — a config
    // with no id, or an id with no config, is a real bug.
    expect(Object.keys(MINDSET_CONFIGS).sort()).toEqual([...MINDSET_IDS].sort())
  })

  it('each config should have all required fields', () => {
    for (const id of MINDSET_IDS) {
      const config = MINDSET_CONFIGS[id]
      expect(config.id).toBe(id)
      expect(config.name).toBeTruthy()
      expect(config.subtitle).toBeTruthy()
      expect(config.description).toBeTruthy()
      expect(config.icon).toBeTruthy()
      expect(config.promptPersonality).toBeTruthy()
      expect(config.promptTone).toBeTruthy()
      expect(config.promptReferences.length).toBeGreaterThan(0)
      expect(config.backgroundPool.length).toBeGreaterThan(0)
      expect(typeof config.astrologyEnabled).toBe('boolean')
    }
  })

  it('only scholar should have astrology enabled', () => {
    for (const id of MINDSET_IDS) {
      if (id === 'scholar') {
        expect(MINDSET_CONFIGS[id].astrologyEnabled).toBe(true)
      } else {
        expect(MINDSET_CONFIGS[id].astrologyEnabled).toBe(false)
      }
    }
  })

  it('should have unique names', () => {
    const names = Object.values(MINDSET_CONFIGS).map(c => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('should have unique icons', () => {
    const icons = Object.values(MINDSET_CONFIGS).map(c => c.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })
})

describe('getMindsetConfig', () => {
  it('returns the correct config for each mindset', () => {
    const ids: MindsetId[] = ['stoic', 'existentialist', 'cynic', 'hedonist', 'samurai', 'scholar']
    for (const id of ids) {
      const config = getMindsetConfig(id)
      expect(config.id).toBe(id)
    }
  })
})
