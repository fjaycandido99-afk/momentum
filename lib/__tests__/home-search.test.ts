import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { searchHome, scoreItem, PAGES, allSearchItems } from '@/lib/search/home-search'

describe('home search', () => {
  it('finds a soundscape by name', () => {
    expect(searchHome('rain')[0]).toMatchObject({ kind: 'soundscape', id: 'rain' })
  })

  it('ranks a title start above a keyword match', () => {
    // "sle" is the start of Sleep (a soundscape and a guided session) —
    // nothing whose only link is a keyword should beat them.
    const top = searchHome('sle').slice(0, 2).map(r => r.title)
    expect(top.every(t => t.toLowerCase().startsWith('sle'))).toBe(true)
  })

  it('finds pages by what people call them, not just their titles', () => {
    expect(searchHome('diary').map(r => r.id)).toContain('journal')
    expect(searchHome('workout').map(r => r.id)).toContain('training')
    expect(searchHome('anxious').map(r => r.id)).toContain('reset')
  })

  it('needs every word to match', () => {
    expect(searchHome('rain zebra')).toEqual([])
  })

  it('ignores case and accents', () => {
    expect(scoreItem(PAGES[0], 'JOURNAL')).toBeGreaterThan(0)
    expect(searchHome('jóurnal').map(r => r.id)).toContain('journal')
  })

  it('returns nothing for an empty query', () => {
    expect(searchHome('   ')).toEqual([])
  })

  it('has no duplicate results', () => {
    const keys = allSearchItems().map(i => `${i.kind}-${i.id}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('every page search can open exists', () => {
  // The search sheet is also where the old header menu's places went. A link
  // to a route that isn't there is a dead end at the one place meant to find
  // everything.
  for (const page of PAGES) {
    it(page.href!, () => {
      const dir = path.join(process.cwd(), 'app', '(dashboard)', page.href!.replace(/^\//, ''))
      expect(fs.existsSync(path.join(dir, 'page.tsx')), dir).toBe(true)
    })
  }
})
