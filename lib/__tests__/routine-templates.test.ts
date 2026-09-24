import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEMPLATE,
  ERA_TEMPLATES,
  seedTemplate,
  templateFor,
} from '@/lib/routines/templates'
import { ERA_PRESETS } from '@/lib/era/presets'
import { ERA_PRACTICE_DOMAIN } from '@/lib/era/keep'
import { MAX_ROUTINE_STEPS, ROUTINE_LIMITS, isValidTime, validateSteps } from '@/lib/routines/steps'

const GYM = { id: 'p-gym', preset_key: 'gym_ppl' }
const STUDY = { id: 'p-study', preset_key: 'study_hour' }

describe('routine templates', () => {
  it('has one for every era on the picker', () => {
    for (const era of ERA_PRESETS) {
      expect(ERA_TEMPLATES[era.key], `no template for ${era.key}`).toBeDefined()
    }
  })

  it('falls back rather than opening blank', () => {
    expect(templateFor(null)).toBe(DEFAULT_TEMPLATE)
    expect(templateFor('an_era_that_never_shipped')).toBe(DEFAULT_TEMPLATE)
    expect(templateFor('gym_arc')).toBe(ERA_TEMPLATES.gym_arc)
  })

  it('never seeds an empty routine', () => {
    for (const template of [DEFAULT_TEMPLATE, ...Object.values(ERA_TEMPLATES)]) {
      expect(seedTemplate(template).length).toBeGreaterThan(0)
    }
  })

  it('every template is savable by the same rules the editor enforces', () => {
    for (const [key, template] of Object.entries(ERA_TEMPLATES)) {
      const steps = seedTemplate(template, [GYM, STUDY])
      expect(validateSteps(steps, template.mode), key).toBeNull()
      expect(steps.length).toBeLessThanOrEqual(MAX_ROUTINE_STEPS)
      expect(template.label.length).toBeLessThanOrEqual(ROUTINE_LIMITS.label)
      expect(isValidTime(template.start), `${key} start`).toBe(true)
      for (const step of template.steps) {
        expect(isValidTime(step.time), `${key} ${step.kind}`).toBe(true)
        expect((step.label ?? '').length).toBeLessThanOrEqual(ROUTINE_LIMITS.stepLabel)
      }
    }
  })

  it('and the default one is too', () => {
    expect(validateSteps(seedTemplate(DEFAULT_TEMPLATE), DEFAULT_TEMPLATE.mode)).toBeNull()
  })

  /**
   * The rule from lib/era/keep.ts, held here so a later template cannot
   * quietly decide that Confidence Mode is about the gym.
   */
  it('only asks for a discipline in the two eras that map to a domain', () => {
    for (const [key, template] of Object.entries(ERA_TEMPLATES)) {
      const wanted = template.steps.filter(s => s.domain)
      if (wanted.length === 0) continue
      expect(ERA_PRACTICE_DOMAIN[key], `${key} guesses a domain`).toBeDefined()
      for (const step of wanted) {
        expect(step.domain).toBe(ERA_PRACTICE_DOMAIN[key])
      }
    }
  })

  it('drops a discipline step when they have no discipline for it', () => {
    const withGym = seedTemplate(ERA_TEMPLATES.gym_arc, [GYM])
    const without = seedTemplate(ERA_TEMPLATES.gym_arc, [])

    expect(withGym.some(s => s.kind === 'practice' && s.ref === GYM.id)).toBe(true)
    expect(without.some(s => s.kind === 'practice')).toBe(false)
    expect(without.length).toBe(withGym.length - 1)
    // And what is left still saves — the point of dropping it.
    expect(validateSteps(without, 'timed')).toBeNull()
  })

  it('does not hand a study step somebody’s gym discipline', () => {
    const steps = seedTemplate(ERA_TEMPLATES.study, [GYM])
    expect(steps.some(s => s.kind === 'practice')).toBe(false)
  })

  it('drops the times in sequence mode, keeps them in timed', () => {
    expect(seedTemplate(DEFAULT_TEMPLATE).every(s => s.time === null)).toBe(true)
    expect(seedTemplate(ERA_TEMPLATES.five_am).every(s => typeof s.time === 'string')).toBe(true)
  })

  it('arrives in the order the builder would put it in', () => {
    const steps = seedTemplate(ERA_TEMPLATES.stoic_mode)
    const times = steps.map(s => s.time)
    expect([...times].sort()).toEqual(times)
  })

  it('seeds no floors of its own', () => {
    for (const template of Object.values(ERA_TEMPLATES)) {
      expect(seedTemplate(template, [GYM, STUDY]).every(s => s.minimum === '')).toBe(true)
    }
  })

  it('every template offers a minimum day', () => {
    for (const [key, template] of Object.entries(ERA_TEMPLATES)) {
      const kept = seedTemplate(template, [GYM, STUDY]).filter(s => s.inMinimum)
      expect(kept.length, `${key} has no minimum`).toBeGreaterThan(0)
    }
  })
})
