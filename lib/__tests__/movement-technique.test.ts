import { describe, it, expect } from 'vitest'
import {
  TECHNIQUE_ERRORS,
  calloutLines,
  pairLines,
  parseCalloutLines,
  parsePairLines,
  toTechnique,
  validateTechnique,
  type TechniqueDraft,
} from '@/lib/movements/technique'

const ok: TechniqueDraft = {
  movementId: 'back_squat',
  reviewedBy: 'Sam Okafor, CSCS',
  reviewedOn: '2026-09-21',
  steps: ['Set the bar on your shoulders, not your neck.', 'Stand up out of the rack.'],
  cues: [{ label: 'Chest proud', detail: 'Ribs down, eyes forward.' }],
  mistakes: [{ label: 'Knees falling in' }],
  callouts: [{ label: 'Chest proud', x: 30, y: 25, side: 'left' }],
}

describe('accepting reviewed technique', () => {
  it('accepts a draft with a person, a date and steps', () => {
    expect(validateTechnique(ok)).toBeNull()
  })

  it('refuses a movement that is not in the library', () => {
    expect(validateTechnique({ ...ok, movementId: 'nope' })).toBe('unknown_movement')
  })

  it('demands a name, and demands that it be a person', () => {
    // The screen prints this name. A reader deciding whether to trust a cue
    // is entitled to know whose cue it is — and "Voxu" is not an answer,
    // because the whole point is that the app didn't write it.
    expect(validateTechnique({ ...ok, reviewedBy: '   ' })).toBe('reviewer_required')
    expect(validateTechnique({ ...ok, reviewedBy: 'Voxu' })).toBe('reviewer_not_a_person')
    expect(validateTechnique({ ...ok, reviewedBy: 'the team' })).toBe('reviewer_not_a_person')
    expect(validateTechnique({ ...ok, reviewedBy: 'ChatGPT' })).toBe('reviewer_not_a_person')
    expect(validateTechnique({ ...ok, reviewedBy: 'Claude' })).toBe('reviewer_not_a_person')
    expect(validateTechnique({ ...ok, reviewedBy: 'A' })).toBe('reviewer_not_a_person')
  })

  it('demands a date, because guidance ages', () => {
    expect(validateTechnique({ ...ok, reviewedOn: '' })).toBe('date_required')
    expect(validateTechnique({ ...ok, reviewedOn: 'last week' })).toBe('date_required')
    expect(validateTechnique({ ...ok, reviewedOn: '21/09/2026' })).toBe('date_required')
  })

  it('needs at least one step and not more than a screenful', () => {
    expect(validateTechnique({ ...ok, steps: [] })).toBe('steps_required')
    expect(validateTechnique({ ...ok, steps: ['   ', ''] })).toBe('steps_required')
    expect(validateTechnique({ ...ok, steps: Array(9).fill('Stand up.') })).toBe('too_many_steps')
    expect(validateTechnique({ ...ok, steps: ['x'.repeat(201)] })).toBe('step_too_long')
  })

  it('refuses a dose, wherever it is hidden', () => {
    // A reviewer can say how to move. How much is between the person and
    // their own coach — nobody in this system has examined them.
    const doses = [
      'Do 3 x 8 with control.',
      'Work up to 20kg.',
      'Hold for 30 seconds.',
      'Two sets of 5.',
      'Leave 2 RIR in the tank.',
      'Use 80% of your 1RM.',
      'Rest 90 secs between efforts.',
    ]
    for (const step of doses) {
      expect(validateTechnique({ ...ok, steps: [step] }), step).toBe('dose_not_allowed')
    }
  })

  it('catches a dose in a cue, a mistake or a callout too', () => {
    expect(validateTechnique({ ...ok, cues: [{ label: 'Pause 2 seconds' }] })).toBe('dose_not_allowed')
    expect(validateTechnique({ ...ok, mistakes: [{ label: 'Going too heavy', detail: 'Over 100kg early.' }] }))
      .toBe('dose_not_allowed')
    expect(validateTechnique({ ...ok, callouts: [{ label: '5 reps', x: 10, y: 10, side: 'left' }] }))
      .toBe('dose_not_allowed')
  })

  it('refuses claims about evidence and anything medical', () => {
    expect(validateTechnique({ ...ok, steps: ['Studies show this is safest.'] }))
      .toBe('evidence_claim_not_allowed')
    expect(validateTechnique({ ...ok, steps: ['This is clinically proven.'] }))
      .toBe('evidence_claim_not_allowed')
    expect(validateTechnique({ ...ok, steps: ['This treats back pain.'] }))
      .toBe('medical_claim_not_allowed')
    expect(validateTechnique({ ...ok, cues: [{ label: 'Cures tight hips' }] }))
      .toBe('medical_claim_not_allowed')
  })

  it('keeps callouts on the picture', () => {
    expect(validateTechnique({ ...ok, callouts: [{ label: 'x', x: 120, y: 10, side: 'left' }] }))
      .toBe('callout_off_image')
    expect(validateTechnique({ ...ok, callouts: [{ label: 'x', x: 10, y: -1, side: 'left' }] }))
      .toBe('callout_off_image')
  })

  it('caps how much can be shown', () => {
    expect(validateTechnique({ ...ok, cues: Array(5).fill({ label: 'Up' }) })).toBe('too_many')
    expect(validateTechnique({ ...ok, callouts: Array(5).fill({ label: 'Up', x: 1, y: 1, side: 'left' }) }))
      .toBe('too_many')
  })

  it('has a readable message for every error it can return', () => {
    for (const [key, message] of Object.entries(TECHNIQUE_ERRORS)) {
      expect(message.length, key).toBeGreaterThan(10)
      // Written for the person filling the form, not for a log.
      expect(message, key).not.toMatch(/invalid|error|failed|400/i)
    }
  })
})

describe('toTechnique', () => {
  it('trims, drops blanks, and keeps the reviewer and the date', () => {
    const t = toTechnique({
      ...ok,
      steps: ['  Set the bar.  ', '', '  Stand up.  '],
      cues: [{ label: ' Chest proud ', detail: '  ' }, { label: '' }],
    })
    expect(t.steps).toEqual(['Set the bar.', 'Stand up.'])
    expect(t.cues).toEqual([{ label: 'Chest proud' }])
    expect(t.reviewedBy).toBe('Sam Okafor, CSCS')
    expect(t.reviewedOn).toBe('2026-09-21')
  })
})

describe('the editor’s line format', () => {
  it('round-trips callouts', () => {
    const lines = 'Chest proud | Ribs down | 30 | 25 | left\nKnees out |  | 60 | 55 | right'
    const parsed = parseCalloutLines(lines)
    expect(parsed).toEqual([
      { label: 'Chest proud', detail: 'Ribs down', x: 30, y: 25, side: 'left' },
      { label: 'Knees out', detail: undefined, x: 60, y: 55, side: 'right' },
    ])
    expect(calloutLines(parsed)).toContain('Chest proud | Ribs down | 30 | 25 | left')
  })

  it('defaults a missing side to left rather than throwing', () => {
    expect(parseCalloutLines('Chest proud')?.[0]).toEqual({
      label: 'Chest proud',
      detail: undefined,
      x: 0,
      y: 0,
      side: 'left',
    })
  })

  it('round-trips cues and mistakes', () => {
    const parsed = parsePairLines('Chest proud | Ribs down\nKnees out')
    expect(parsed).toEqual([{ label: 'Chest proud', detail: 'Ribs down' }, { label: 'Knees out' }])
    expect(pairLines(parsed)).toBe('Chest proud | Ribs down\nKnees out')
  })

  it('ignores blank lines', () => {
    expect(parsePairLines('\n\n  \n')).toEqual([])
    expect(parseCalloutLines('\n \n')).toEqual([])
  })
})
