import { describe, it, expect } from 'vitest'
import { parseMeasure, receipts, receiptLine } from '@/lib/era/measure'

describe('measurable promises', () => {
  it('keeps a tag alone, or a tag with a whole amount AND a known unit', () => {
    expect(parseMeasure({ tag: ' Gym ' })).toEqual({ tag: 'Gym', amount: null, unit: null })
    expect(parseMeasure({ tag: 'Reading', amount: '20', unit: 'pages' })).toEqual({ tag: 'Reading', amount: 20, unit: 'pages' })
    expect(parseMeasure({ tag: 'Reading', amount: 20 })).toEqual({ tag: 'Reading', amount: null, unit: null })
    expect(parseMeasure({ tag: 'Run', amount: 2.5, unit: 'km' })).toEqual({ tag: 'Run', amount: null, unit: null })
    expect(parseMeasure({ tag: 'x', amount: 5, unit: 'lbs' })).toEqual({ tag: 'x', amount: null, unit: null })
    expect(parseMeasure({ tag: '' })).toBeNull()
    expect(parseMeasure(null)).toBeNull()
  })

  it('totals only KEPT promises, grouped case-insensitively, most kept first', () => {
    const r = receipts([
      { tag: 'Gym', amount: null, unit: null, kept: true },
      { tag: 'gym', amount: null, unit: null, kept: true },
      { tag: 'Gym', amount: null, unit: null, kept: false },
      { tag: 'Reading', amount: 20, unit: 'pages', kept: true },
      { tag: 'Reading', amount: 30, unit: 'minutes', kept: true },
      { tag: 'Reading', amount: 15, unit: 'pages', kept: null },
      { tag: null, amount: null, unit: null, kept: true },
    ])
    expect(r.map(receiptLine)).toEqual(['Gym ×2', 'Reading — 30 minutes · 20 pages'])
  })
})
