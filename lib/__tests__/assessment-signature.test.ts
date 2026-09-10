import { describe, it, expect } from 'vitest'
import { computeRead, AXIS_IDS, MIN_ANSWERS_FOR_READ, type AxisId, type ScoredAnswer } from '@/lib/assessment/axes'
import {
  computeSignature,
  parseSignatureKey,
  signatureKey,
  MIN_AXIS_ANSWERS,
  SIGNATURES,
  STRONG,
  type Pole,
} from '@/lib/assessment/signature'

/** Answers that push the given axes to the given values, all direction +1. */
function answersFrom(values: Partial<Record<AxisId, number>>, perAxis = 3): ScoredAnswer[] {
  const out: ScoredAnswer[] = []
  for (const axis of AXIS_IDS) {
    const v = values[axis] ?? 0
    for (let i = 0; i < perAxis; i++) out.push({ axis, direction: 1, score: v + 3 })
  }
  return out
}

const POLES: Pole[] = ['low', 'high']

describe('signature naming', () => {
  it('has a written name for all twenty-four pole pairs', () => {
    const keys = new Set<string>()
    for (let i = 0; i < AXIS_IDS.length; i++) {
      for (let j = i + 1; j < AXIS_IDS.length; j++) {
        for (const a of POLES) {
          for (const b of POLES) {
            keys.add(signatureKey(AXIS_IDS[i], a, AXIS_IDS[j], b))
          }
        }
      }
    }
    expect(keys.size).toBe(24)
    for (const key of keys) {
      expect(SIGNATURES[key], `missing signature for ${key}`).toBeTruthy()
      expect(SIGNATURES[key].name.length).toBeGreaterThan(0)
      expect(SIGNATURES[key].blurb.length).toBeGreaterThan(0)
      // The probe opens a conversation, so it has to actually ask something.
      expect(SIGNATURES[key].probe.trim().endsWith('?')).toBe(true)
    }
    // And nothing in the table that no read can reach.
    expect(Object.keys(SIGNATURES).length).toBe(24)
  })

  it('gives every name and blurb its own words', () => {
    const names = Object.values(SIGNATURES).map(s => s.name)
    const blurbs = Object.values(SIGNATURES).map(s => s.blurb)
    expect(new Set(names).size).toBe(names.length)
    expect(new Set(blurbs).size).toBe(blurbs.length)
  })

  it('keys a pair the same way whichever axis is stronger', () => {
    expect(signatureKey('inquiry', 'high', 'agency', 'low'))
      .toBe(signatureKey('agency', 'low', 'inquiry', 'high'))
  })

  it('says nothing before there are enough answers behind it', () => {
    const few: ScoredAnswer[] = Array.from({ length: MIN_ANSWERS_FOR_READ - 1 }, () => ({
      axis: 'agency', direction: 1, score: 5,
    }))
    expect(computeSignature(computeRead(few))).toBeNull()
  })

  it('says nothing when every axis sits near the centre', () => {
    // Twelve answers, all of them dead centre: plenty of data, no position.
    const read = computeRead(answersFrom({}))
    expect(read.answered).toBeGreaterThanOrEqual(MIN_ANSWERS_FOR_READ)
    expect(computeSignature(read)).toBeNull()
  })

  it('names a single trait, unnamed, when only one axis is strong', () => {
    const sig = computeSignature(computeRead(answersFrom({ inquiry: 2 })))
    expect(sig).toBeTruthy()
    expect(sig!.named).toBe(false)
    // A trait is not a cohort — it must never get a bucket to be counted in.
    expect(sig!.key).toBeNull()
    expect(sig!.name).toBe('Questions first')
  })

  it('names the two axes furthest from centre, not the first two', () => {
    // Agency is strong but inquiry and faith are stronger.
    const sig = computeSignature(computeRead(answersFrom({ agency: 1, inquiry: 2, faith: -2 })))
    expect(sig!.named).toBe(true)
    expect(sig!.key).toBe(signatureKey('inquiry', 'high', 'faith', 'low'))
    expect(sig!.name).toBe('The Second Look')
  })

  it('reads the pole from the sign of each axis', () => {
    const built = computeSignature(computeRead(answersFrom({ discipline: 2, inquiry: 2 })))
    expect(built!.name).toBe('The Careful Build')
    const loose = computeSignature(computeRead(answersFrom({ discipline: -2, inquiry: -2 })))
    expect(loose!.name).toBe('The Loose Grip')
  })

  it('ignores an axis sitting just inside the threshold', () => {
    const sig = computeSignature(computeRead(answersFrom({ agency: 2, discipline: STRONG - 0.1 })))
    // Only agency qualifies, so this is a trait and not an agency/discipline pair.
    expect(sig!.named).toBe(false)
    expect(sig!.name).toBe('Bends things to will')
  })

  it('is stable: the same answers always produce the same name', () => {
    // Two axes exactly equal in strength — the tie must not flip between runs.
    const values = { agency: 2, faith: 2 } as const
    const first = computeSignature(computeRead(answersFrom(values)))
    const second = computeSignature(computeRead(answersFrom(values)))
    expect(first!.key).toBe(second!.key)
    expect(first!.key).toBe(signatureKey('agency', 'high', 'faith', 'high'))
  })

  it('will not name an axis that only one or two answers stand behind', () => {
    // Inquiry is at full strength on a single tap; agency earned its place.
    const read = computeRead([
      ...Array.from({ length: MIN_AXIS_ANSWERS - 1 }, () => ({ axis: 'inquiry' as AxisId, direction: 1 as const, score: 5 })),
      ...Array.from({ length: MIN_AXIS_ANSWERS }, () => ({ axis: 'agency' as AxisId, direction: 1 as const, score: 5 })),
      ...Array.from({ length: MIN_AXIS_ANSWERS }, () => ({ axis: 'discipline' as AxisId, direction: 1 as const, score: 3 })),
      ...Array.from({ length: MIN_AXIS_ANSWERS }, () => ({ axis: 'faith' as AxisId, direction: 1 as const, score: 3 })),
    ])
    expect(read.axes.inquiry).toBe(2)
    const sig = computeSignature(read)
    // A trait on agency alone — NOT an agency/inquiry pair off one tap, and
    // never a confident name above an axis bar with nothing in it.
    expect(sig!.named).toBe(false)
    expect(sig!.name).toBe('Bends things to will')
  })

  it('keeps the standing name when the challenger only just edges ahead', () => {
    // Raw reading would be discipline+faith; discipline+inquiry is standing
    // and only 0.2 behind, which is jitter, not movement.
    const read = computeRead(answersFrom({ discipline: 2, inquiry: 0.8, faith: 1 }))
    const standing = signatureKey('discipline', 'high', 'inquiry', 'high')
    expect(computeSignature(read)!.key).toBe(signatureKey('discipline', 'high', 'faith', 'high'))
    expect(computeSignature(read, standing)!.key).toBe(standing)
    expect(computeSignature(read, standing)!.name).toBe('The Careful Build')
  })

  it('gives the name up when the challenger genuinely wins', () => {
    const read = computeRead(answersFrom({ discipline: 2, inquiry: 0.6, faith: 2 }))
    const standing = signatureKey('discipline', 'high', 'inquiry', 'high')
    expect(computeSignature(read, standing)!.key).toBe(signatureKey('discipline', 'high', 'faith', 'high'))
  })

  it('drops the standing name the moment one of its axes crosses the centre', () => {
    // Stickiness must never hold a name that is now simply wrong: inquiry has
    // gone from "questions first" to "acts on instinct".
    const read = computeRead(answersFrom({ discipline: 2, inquiry: -1, faith: 1.5 }))
    const standing = signatureKey('discipline', 'high', 'inquiry', 'high')
    const sig = computeSignature(read, standing)
    expect(sig!.key).toBe(signatureKey('discipline', 'high', 'faith', 'high'))
    expect(sig!.key).not.toBe(standing)
  })

  it('ignores a previous key that is not one of ours', () => {
    const read = computeRead(answersFrom({ discipline: 2, inquiry: 2 }))
    expect(computeSignature(read, 'agency:sideways|moon:high')!.name).toBe('The Careful Build')
    expect(parseSignatureKey('agency:sideways|moon:high')).toBeNull()
    expect(parseSignatureKey(signatureKey('agency', 'low', 'faith', 'high'))).toEqual({
      axes: ['agency', 'faith'],
      poles: ['low', 'high'],
    })
  })

  it('rates confidence on this name’s own margin, not the mindset model’s', () => {
    // Second axis miles clear of both the threshold and the runner-up, with
    // enough answers behind it.
    const decisive = computeSignature(computeRead(answersFrom({ agency: 2, discipline: 2 }, 6)))
    expect(decisive!.confidence).toBe('clear')

    // Same pair, but a third axis is breathing down its neck — the pair is
    // near enough arbitrary, however many answers there are.
    const arbitrary = computeSignature(computeRead(answersFrom({ agency: 2, discipline: 1.5, inquiry: 1.4 }, 6)))
    expect(arbitrary!.confidence).toBe('early')

    // Clear of the runner-up but only just over the line itself.
    const emerging = computeSignature(computeRead(answersFrom({ agency: 2, discipline: 0.8 })))
    expect(emerging!.confidence).toBe('emerging')
  })

  it('never names a mindset — that is the whole point of this module', () => {
    const mindsetNames = ['Stoic', 'Existentialist', 'Cynic', 'Hedonist', 'Samurai', 'Scholar', 'Manifestor', 'Hustler']
    for (const { name } of Object.values(SIGNATURES)) {
      expect(mindsetNames).not.toContain(name)
    }
  })
})
