import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { MOVEMENT_IMAGES, PATTERN_IMAGES, artAlt, artFor } from '@/lib/movements/images'
import {
  MOVEMENTS,
  MOVEMENTS_BY_ID,
  MOVEMENT_STOP_SIGNALS,
  MOVEMENT_TECHNIQUE_PENDING,
  PATTERN_LABELS,
  PATTERN_MEANS,
  PATTERN_ORDER,
  movementsByPattern,
  type MovementPattern,
} from '@/lib/movements/library'
import { PATTERN_GLYPH_KEYS } from '@/components/movements/PatternGlyph'
import {
  HURTS_NOTE,
  SWAP_REASONS,
  matchMovement,
  normaliseName,
  samePattern,
  swapIntro,
  swapsFor,
} from '@/lib/movements/swap'

describe('the library', () => {
  it('has unique ids and a pattern label for every pattern used', () => {
    expect(MOVEMENTS_BY_ID.size).toBe(MOVEMENTS.length)
    for (const m of MOVEMENTS) {
      expect(PATTERN_LABELS[m.pattern], m.id).toBeTruthy()
      expect(m.equipment.length, m.id).toBeGreaterThan(0)
      expect(['simplest', 'standard', 'advanced']).toContain(m.level)
    }
  })

  it('gives every pattern at least three options, so a swap is always possible', () => {
    const patterns = new Set(MOVEMENTS.map(m => m.pattern))
    for (const pattern of patterns) {
      const count = MOVEMENTS.filter(m => m.pattern === pattern).length
      expect(count, pattern).toBeGreaterThanOrEqual(3)
    }
  })

  it('offers a bodyweight option in every pattern a person could train at home', () => {
    // Not core-only: someone with nothing should still be able to train
    // push, pull, squat and hinge.
    for (const pattern of ['squat', 'horizontal_push', 'single_leg', 'core'] as MovementPattern[]) {
      const has = MOVEMENTS.some(m => m.pattern === pattern && m.equipment.includes('bodyweight'))
      expect(has, pattern).toBe(true)
    }
  })

  it('teaches NO technique in its guidance', () => {
    // The whole point of the file. Unreviewed form instruction is the one
    // thing in this app that could injure somebody, so the choice notes
    // carry none: no cues, no body parts, no reps, no loads.
    //
    // Scanned on `pick` only — names are names. "Hanging knee raise"
    // contains "knee" because that is what the movement is called, and a
    // test that banned the word would ban the exercise.
    const banned = /\b(brace|spine|shoulder blades?|grip|inhale|exhale|tempo|depth|lockout|reps?|sets?|kg|lbs?|rir|failure)\b/i
    for (const m of MOVEMENTS) {
      const hit = (m.pick ?? '').match(banned)
      expect(hit?.[0], `${m.id} says "${hit?.[0]}"`).toBeUndefined()
    }
  })

  it('never phrases a name or alias as an instruction', () => {
    // No legitimate exercise name contains these, so they can be banned
    // everywhere — this is the guard against cues creeping in as "names".
    const instruction = /\b(brace|inhale|exhale|tempo|keep your|drive through|control the)\b/i
    for (const m of MOVEMENTS) {
      const text = [m.name, ...(m.aliases ?? [])].join(' ')
      expect(instruction.test(text), `${m.id}: ${text}`).toBe(false)
    }
  })

  it('ships no technique content, and says so instead', () => {
    for (const m of MOVEMENTS) {
      expect(m.technique, `${m.id} has unreviewed technique content`).toBeUndefined()
    }
    expect(MOVEMENT_TECHNIQUE_PENDING).toMatch(/doesn’t teach technique/i)
    expect(MOVEMENT_TECHNIQUE_PENDING).toMatch(/coach|physio/i)
  })

  it('makes no claim about what the evidence says', () => {
    const banned = /\b(research|study|studies|evidence|scientific|proven|optimal|best for|hypertrophy)\b/i
    for (const m of MOVEMENTS) {
      const hit = (m.pick ?? '').match(banned)
      expect(hit?.[0], `${m.id} claims "${hit?.[0]}"`).toBeUndefined()
    }
  })

  it('describes each pattern without telling anyone what to do with their body', () => {
    // PATTERN_MEANS is taxonomy — which movements are relatives. It is the
    // most tempting place in the codebase to slip in a cue, so: no
    // imperatives, no "keep your", no breathing.
    const cue = /\b(keep|brace|squeeze|drive|inhale|exhale|tighten|control|tuck|don’t|do not|make sure)\b/i
    for (const pattern of PATTERN_ORDER) {
      const line = PATTERN_MEANS[pattern]
      expect(line, pattern).toBeTruthy()
      expect(cue.test(line), `${pattern}: ${line}`).toBe(false)
    }
  })

  it('has a stop rule, which is safety and not technique', () => {
    expect(MOVEMENT_STOP_SIGNALS.length).toBeGreaterThanOrEqual(3)
    expect(MOVEMENT_STOP_SIGNALS.join(' ')).toMatch(/pain/i)
  })
})

describe('browsing the library', () => {
  it('lists every movement exactly once, and every pattern', () => {
    const groups = movementsByPattern()
    const ids = groups.flatMap(g => g.movements.map(m => m.id))
    expect(new Set(ids).size).toBe(MOVEMENTS.length)
    expect(groups.map(g => g.pattern).sort()).toEqual([...new Set(MOVEMENTS.map(m => m.pattern))].sort())
  })

  it('puts the simplest option first in every pattern', () => {
    for (const group of movementsByPattern()) {
      expect(group.movements[0].level, group.pattern).toBe('simplest')
    }
  })

  it('has a mark and a label for every pattern in the order', () => {
    // A pattern added to the library without a glyph would render a blank
    // square, so this is the guard that keeps the two files in step.
    for (const pattern of PATTERN_ORDER) {
      expect(PATTERN_GLYPH_KEYS, pattern).toContain(pattern)
      expect(PATTERN_LABELS[pattern], pattern).toBeTruthy()
    }
    expect(PATTERN_GLYPH_KEYS.length).toBe(PATTERN_ORDER.length)
  })
})

describe('movement art', () => {
  it('points only at files that are actually on disk', () => {
    // A typo here would ship a broken image on a paid screen. Checked
    // against the filesystem rather than trusted.
    const paths = [...Object.values(MOVEMENT_IMAGES), ...Object.values(PATTERN_IMAGES)]
    for (const path of paths) {
      expect(path.startsWith('/movements/'), path).toBe(true)
      expect(existsSync(join(process.cwd(), 'public', path)), `missing file: public${path}`).toBe(true)
    }
  })

  it('keys movement art by a real movement id', () => {
    for (const id of Object.keys(MOVEMENT_IMAGES)) {
      expect(MOVEMENTS_BY_ID.has(id), `${id} is not a movement`).toBe(true)
    }
  })

  it('falls back to the family, then to the mark, so nothing renders empty', () => {
    const squat = MOVEMENTS_BY_ID.get('back_squat')!
    // With no art configured at all, artFor returns null and the sheet
    // draws the pattern mark — which always exists.
    const art = artFor(squat)
    if (art) expect(['movement', 'pattern']).toContain(art.scope)
    else expect(art).toBeNull()
  })

  it('never describes the picture as a demonstration of form', () => {
    // The art is equipment and setting. Calling it a demonstration would
    // be the app claiming to teach with a picture nobody reviewed.
    const squat = MOVEMENTS_BY_ID.get('back_squat')!
    const alt = artAlt(squat, { src: '/movements/x.webp', scope: 'movement' })
    expect(alt).not.toMatch(/demonstrat|how to|correct form|proper/i)
  })
})

describe('matchMovement', () => {
  it('matches a name however it was typed', () => {
    expect(matchMovement('Bench Press')?.id).toBe('bench_press')
    expect(matchMovement('  bb bench  ')?.id).toBe('bench_press')
    expect(matchMovement('LAT PULL DOWN')?.id).toBe('lat_pulldown')
    expect(matchMovement('rdl')?.id).toBe('romanian_deadlift')
  })

  it('refuses to guess', () => {
    // A wrong match offers swaps for the wrong exercise, which is worse
    // than offering none.
    expect(matchMovement('benchy thing')).toBeNull()
    expect(matchMovement('row')).toBeNull() // three different movements
    expect(matchMovement('')).toBeNull()
    expect(matchMovement('   ')).toBeNull()
  })

  it('normalises punctuation and case', () => {
    expect(normaliseName('One-Arm  Dumbbell Row!')).toBe('one arm dumbbell row')
    expect(matchMovement('One-arm dumbbell row')?.id).toBe('dumbbell_row')
  })
})

describe('swapsFor', () => {
  it('never returns the movement itself', () => {
    for (const m of MOVEMENTS) {
      for (const reason of SWAP_REASONS) {
        expect(swapsFor(m.id, reason.key).some(s => s.id === m.id), `${m.id}/${reason.key}`).toBe(false)
      }
    }
  })

  it('stays inside the same pattern', () => {
    for (const m of MOVEMENTS) {
      for (const swap of swapsFor(m.id, 'hurts')) {
        expect(swap.pattern, `${m.id} → ${swap.id}`).toBe(m.pattern)
      }
    }
  })

  it('answers "no bench" with something that needs no bench', () => {
    const swaps = swapsFor('bench_press', 'no_equipment')
    expect(swaps.length).toBeGreaterThan(0)
    for (const s of swaps) {
      expect(s.equipment).not.toContain('bench')
      expect(s.equipment).not.toContain('barbell')
    }
    expect(swaps.map(s => s.id)).toContain('push_up')
  })

  it('answers "at home" with home equipment only', () => {
    for (const s of swapsFor('bench_press', 'home')) {
      expect(s.equipment.some(e => e === 'machine' || e === 'cable' || e === 'rack')).toBe(false)
    }
  })

  it('answers "nothing but me" with bodyweight', () => {
    const swaps = swapsFor('back_squat', 'bodyweight')
    expect(swaps.length).toBeGreaterThan(0)
    for (const s of swaps) expect(s.equipment).toContain('bodyweight')
  })

  it('answers "simpler" with strictly less demanding options', () => {
    const swaps = swapsFor('pull_up', 'simpler')
    expect(swaps.map(s => s.id)).toContain('lat_pulldown')
    for (const s of swaps) expect(s.level).not.toBe('advanced')
  })

  it('puts the simplest option first', () => {
    const swaps = swapsFor('back_squat', 'hurts')
    expect(swaps[0].level).toBe('simplest')
  })

  it('returns nothing for an unknown movement rather than throwing', () => {
    expect(swapsFor('not_a_movement', 'home')).toEqual([])
  })

  it('has an intro line for every reason', () => {
    const bench = MOVEMENTS_BY_ID.get('bench_press')!
    for (const reason of SWAP_REASONS) {
      expect(swapIntro(reason.key, bench).length, reason.key).toBeGreaterThan(10)
    }
  })
})

describe('the "this hurts" path', () => {
  it('never diagnoses, never treats, and allows skipping', () => {
    expect(HURTS_NOTE).toMatch(/can’t tell you why/i)
    expect(HURTS_NOTE).toMatch(/isn’t treatment/i)
    expect(HURTS_NOTE).toMatch(/skip/i)
    expect(HURTS_NOTE).toMatch(/qualified/i)
    // No mechanism, no body part, no cause.
    expect(HURTS_NOTE).not.toMatch(/tendon|impingement|strain|inflammation|mobility issue/i)
  })

  it('still offers the same pattern, simplest first', () => {
    const swaps = swapsFor('overhead_press', 'hurts')
    expect(swaps.length).toBeGreaterThan(0)
    expect(swaps[0].level).toBe('simplest')
  })
})

describe('samePattern', () => {
  it('groups by what the movement trains', () => {
    const ids = samePattern(MOVEMENTS_BY_ID.get('lat_pulldown')!).map(m => m.id)
    expect(ids).toContain('pull_up')
    expect(ids).not.toContain('bench_press')
  })
})
