import { describe, it, expect } from 'vitest'
import { ERA_PRACTICE_DOMAIN, keepOptions, labelFromPromise } from '@/lib/era/keep'
import { ERA_PRESETS } from '@/lib/era/presets'
import { DOMAINS } from '@/lib/practices/presets'

const p = (text: string) => ({ text })

describe('which era maps to a discipline domain', () => {
  it('maps the two that genuinely do', () => {
    expect(ERA_PRACTICE_DOMAIN.gym_arc).toBe('gym')
    expect(ERA_PRACTICE_DOMAIN.study).toBe('study')
  })

  it('leaves the six that describe behaviour unmapped', () => {
    // There is no domain for "stop drifting". Guessing one would put the
    // habit in the wrong room and hand them the wrong how-to.
    for (const key of ['locked_in', 'discipline', 'comeback', 'stoic_mode', 'confidence', 'five_am']) {
      expect(ERA_PRACTICE_DOMAIN[key], key).toBeUndefined()
    }
  })

  it('only ever names a real era and a real domain', () => {
    // A typo here would silently seed nothing, which looks like the feature
    // not working rather than a bad key.
    const eras = new Set(ERA_PRESETS.map(e => e.key))
    const domains = new Set(DOMAINS.map(d => d.id))
    for (const [eraKey, domain] of Object.entries(ERA_PRACTICE_DOMAIN)) {
      expect(eras.has(eraKey), `era ${eraKey}`).toBe(true)
      if (domain) expect(domains.has(domain), `domain ${domain}`).toBe(true)
    }
  })
})

describe('the promises worth offering', () => {
  it('counts repeats and puts the most-promised first', () => {
    const got = keepOptions([p('Gym before work'), p('Read 10 pages'), p('Gym before work'), p('Gym before work')])
    expect(got[0]).toEqual({ text: 'Gym before work', count: 3 })
    expect(got[1]).toEqual({ text: 'Read 10 pages', count: 1 })
  })

  it('treats case, spacing and a trailing full stop as the same promise', () => {
    const got = keepOptions([p('Gym before work'), p('gym  before work.'), p('GYM BEFORE WORK!')])
    expect(got).toHaveLength(1)
    expect(got[0].count).toBe(3)
  })

  it('keeps their words as first written', () => {
    // Not the lowercased key, and not the last version — the first.
    const got = keepOptions([p('Gym before work'), p('gym before work')])
    expect(got[0].text).toBe('Gym before work')
  })

  it('does NOT merge two promises that merely overlap', () => {
    // The decision this feature exists to leave with the user. Deciding
    // "Gym" and "Go to the gym" are the same thing is not ours to make.
    const got = keepOptions([p('Gym'), p('Go to the gym'), p('Gym')])
    expect(got).toHaveLength(2)
    expect(got[0]).toEqual({ text: 'Gym', count: 2 })
  })

  it('keeps first-written order for ties, so the list does not shuffle', () => {
    const got = keepOptions([p('B'), p('A'), p('B'), p('A')])
    expect(got.map(o => o.text)).toEqual(['B', 'A'])
  })

  it('caps the list', () => {
    const many = Array.from({ length: 30 }, (_, i) => p(`Promise ${i}`))
    expect(keepOptions(many)).toHaveLength(5)
    expect(keepOptions(many, 3)).toHaveLength(3)
    expect(keepOptions(many, 0)).toHaveLength(0)
  })

  it('survives empty, blank and junk', () => {
    expect(keepOptions([])).toEqual([])
    expect(keepOptions([p('   '), p('')])).toEqual([])
    expect(keepOptions([{ text: null as unknown as string }])).toEqual([])
  })
})

describe('a promise cut down to a name', () => {
  const MAX = 40

  it('leaves a short one alone', () => {
    expect(labelFromPromise('Gym before work', MAX)).toBe('Gym before work')
  })

  it('cuts a sentence at a word boundary', () => {
    // A real promise is a sentence; a label is a name. This has to land
    // somewhere a person can finish typing.
    const got = labelFromPromise("I'll finish the thing I've been avoiding before lunch", MAX)
    expect(got.length).toBeLessThanOrEqual(MAX)
    expect(got).toBe("I'll finish the thing I've been")
    expect(got).not.toMatch(/\s$/)
  })

  it('adds no ellipsis', () => {
    // "I'll finish the thing I've been…" reads as the app quoting them
    // badly. Without it, it reads as a name half-typed.
    expect(labelFromPromise('a'.repeat(10) + ' ' + 'b'.repeat(60), MAX)).not.toContain('…')
    expect(labelFromPromise('word '.repeat(30), MAX)).not.toContain('...')
  })

  it('hard-cuts a single word with no boundary to break on', () => {
    const got = labelFromPromise('x'.repeat(80), MAX)
    expect(got).toHaveLength(MAX)
  })

  it('normalises whitespace', () => {
    expect(labelFromPromise('  Gym   before    work  ', MAX)).toBe('Gym before work')
  })
})
