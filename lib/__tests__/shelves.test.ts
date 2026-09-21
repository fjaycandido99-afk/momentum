import { describe, it, expect, beforeEach } from 'vitest'
import {
  SHELVES,
  SHELF_IDS,
  parseHidden,
  readHidden,
  toggleShelf,
  writeHidden,
} from '@/lib/ui/shelves'

describe('the shelf list', () => {
  it('has unique ids and says what each one is', () => {
    expect(SHELF_IDS.size).toBe(SHELVES.length)
    for (const s of SHELVES) {
      expect(s.label.length, s.id).toBeGreaterThan(2)
      expect(s.detail.length, s.id).toBeGreaterThan(10)
    }
  })

  it('never offers to hide the app itself', () => {
    // The era loop, the promise, today's audio and today's practice are not
    // shelves. A home screen where everything is optional has no opinion.
    for (const id of ['era', 'promise', 'audio', 'practice', 'practices']) {
      expect(SHELF_IDS.has(id), id).toBe(false)
    }
  })
})

describe('parseHidden', () => {
  it('reads a stored list', () => {
    expect(parseHidden('["music","guided"]').sort()).toEqual(['guided', 'music'])
  })

  it('drops ids it does not recognise', () => {
    // A retired shelf id in old storage must not hide something else.
    expect(parseHidden('["music","made_up"]')).toEqual(['music'])
  })

  it('de-duplicates', () => {
    expect(parseHidden('["music","music"]')).toEqual(['music'])
  })

  it('shows everything when the value is missing or corrupt', () => {
    expect(parseHidden(null)).toEqual([])
    expect(parseHidden('')).toEqual([])
    expect(parseHidden('not json')).toEqual([])
    expect(parseHidden('{"music":true}')).toEqual([])
    expect(parseHidden('[1,2,3]')).toEqual([])
  })
})

describe('toggleShelf', () => {
  it('hides and unhides', () => {
    expect(toggleShelf([], 'music')).toEqual(['music'])
    expect(toggleShelf(['music'], 'music')).toEqual([])
  })

  it('keeps the rest alone', () => {
    expect(toggleShelf(['music'], 'guided').sort()).toEqual(['guided', 'music'])
  })

  it('ignores an id that is not a shelf', () => {
    expect(toggleShelf(['music'], 'era')).toEqual(['music'])
  })
})

describe('with storage', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips', () => {
    writeHidden(['music', 'soundscapes'])
    expect(readHidden().sort()).toEqual(['music', 'soundscapes'])
  })

  it('refuses to store an unknown id', () => {
    writeHidden(['music', 'nonsense'])
    expect(readHidden()).toEqual(['music'])
  })

  it('reads as "show everything" before anything is stored', () => {
    expect(readHidden()).toEqual([])
  })
})
