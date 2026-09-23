import { describe, it, expect } from 'vitest'
import { MINDSET_CONFIGS, getMindsetConfig } from '../configs'
import { MINDSET_DETAILS } from '../detail-content'
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
    }
  })

  it('never names a feature the app does not have', () => {
    // Scholar's subtitle read "Explore mind, myth & cosmos — includes
    // astrology" for months after astrology was deleted. The picker is the
    // first screen a new user reads, so a feature named here is a promise —
    // and this is the only place in the app where mindset copy lives, which
    // makes it the only place that has to hold the line.
    //
    // Flavour is fine: "Cosmic Insight" is a LABEL over the journal
    // reflection, and the reflection is real. What is banned is naming a
    // capability. Add to this list whenever a feature is deleted.
    const DELETED_FEATURES = [/astrolog/i, /zodiac/i, /birth ?chart/i, /star sign/i, /horoscope/i, /routines?\b/i]
    for (const id of MINDSET_IDS) {
      const config = MINDSET_CONFIGS[id]
      const promises = [config.subtitle, config.description].join(' ')
      for (const gone of DELETED_FEATURES) {
        expect(promises, `${id} promises ${gone}`).not.toMatch(gone)
      }
    }
  })

  it('never promises the backgrounds on the commit screen', () => {
    // "What changes for you" is the last thing read before choosing a
    // mindset, and every one of the eight ended with a promise of
    // mindset-themed background visuals. Those were deleted with
    // DailyBackground; `backgroundPool` is kept but rendered by nothing.
    //
    // Checked separately from DELETED_FEATURES above because "background" is
    // a live word elsewhere — background MUSIC and the genre backgrounds from
    // /api/backgrounds both exist. What is banned is a mindset claiming the
    // visuals as something it changes.
    for (const id of MINDSET_IDS) {
      const detail = MINDSET_DETAILS[id]
      for (const line of detail.appExperience) {
        expect(line, `${id}: "${line}"`).not.toMatch(/background (visual|image)/i)
      }
      for (const gone of [/astrolog/i, /zodiac/i, /horoscope/i]) {
        expect(detail.appExperience.join(' '), `${id} promises ${gone}`).not.toMatch(gone)
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
