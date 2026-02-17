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

  it('should have 6 mindsets', () => {
    expect(Object.keys(MINDSET_CONFIGS)).toHaveLength(6)
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
