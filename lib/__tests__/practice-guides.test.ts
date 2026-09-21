import { describe, it, expect } from 'vitest'
import { GUIDE_LIMIT_NOTE, PRACTICE_GUIDES, guideForDomain } from '@/lib/practices/guides'
import { DOMAINS } from '@/lib/practices/presets'

describe('the practice guides', () => {
  it('covers every domain in the picker', () => {
    for (const d of DOMAINS) {
      const guide = guideForDomain(d.id)
      expect(guide, d.id).toBeTruthy()
      expect(guide.steps.length, d.id).toBeGreaterThanOrEqual(4)
      expect(guide.keystone.length, d.id).toBeGreaterThan(20)
      expect(guide.why.length, d.id).toBeGreaterThan(20)
    }
  })

  it('gives every step something to DO, not a topic', () => {
    for (const [domain, guide] of Object.entries(PRACTICE_GUIDES)) {
      for (const step of guide.steps) {
        expect(step.label.length, `${domain}: ${step.label}`).toBeGreaterThan(8)
        expect(step.detail.length, `${domain}: ${step.label}`).toBeGreaterThan(20)
      }
    }
  })

  it('teaches showing up, never technique', () => {
    // The line that keeps this safe: Voxu doesn't know anyone's body, and
    // bad form advice hurts people. No reps, no weights, no pace targets,
    // no heart-rate zones, nothing medical.
    // Prescriptions, not vocabulary: "between sets" is fine (it's their own
    // session), "3 sets of 8" is not. So the pattern looks for NUMBERS
    // attached to training parameters, plus anything medical or pace-based.
    const banned = new RegExp(
      [
        '\\d+\\s*[-–x×]?\\s*\\d*\\s*(sets?|reps?|kg|lbs?|pounds|miles per|km/h|mph)',
        '\\b(1rm|squat depth|bar path|heart rate|bpm|zone\\s*[0-9]|min/mile|min/km)\\b',
        '\\b(calories?|macros?|protein|dose|medication|injur\\w*|diagnos\\w*)\\b',
        '\\d+\\s*[-–]\\s*\\d+\\s*seconds',
      ].join('|'),
      'i',
    )
    for (const [domain, guide] of Object.entries(PRACTICE_GUIDES)) {
      const text = [guide.title, guide.why, guide.keystone, ...guide.steps.flatMap(s => [s.label, s.detail])].join(' ')
      const hit = text.match(banned)
      expect(hit?.[0], `${domain} mentions "${hit?.[0]}"`).toBeUndefined()
    }
  })

  it('says out loud what it will not teach', () => {
    expect(GUIDE_LIMIT_NOTE).toMatch(/technique/i)
    expect(GUIDE_LIMIT_NOTE).toMatch(/qualified/i)
  })

  it('falls back rather than breaking on an unknown domain', () => {
    expect(guideForDomain('made_up').steps.length).toBeGreaterThan(3)
    expect(guideForDomain(undefined).title).toBe(PRACTICE_GUIDES.custom.title)
  })
})
