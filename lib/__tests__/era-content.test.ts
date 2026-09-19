import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { ERA_PROGRAMS } from '../era/programs'
import { ERA_PRESETS, CUSTOM_ERA_KEY } from '../era/presets'
import { eraQuote, eraFirst, eraJournalPrompt } from '../era/content'
import { MINDSET_QUOTES, getDailyMindsetQuote } from '../mindset/quotes'
import { MINDSET_IDS } from '../mindset/types'

const ALL_KEYS = [...ERA_PRESETS.map(p => p.key), CUSTOM_ERA_KEY]
// Read these from source: home-types pulls in React and icon libraries.
const homeTypes = readFileSync('components/home/home-types.ts', 'utf8')
const TOPICS = JSON.parse(homeTypes.match(/export const TOPIC_NAMES = (\[[^\]]*\])/)![1].replace(/'/g, '"')) as string[]
const GENRES = [...homeTypes.matchAll(/\{ id: '([a-z_]+)', word:/g)].map(m => m[1])
const CATEGORIES = new Set(Object.values(MINDSET_QUOTES).flat().map(q => q.category))

describe('era content profiles', () => {
  it('point only at content that exists', () => {
    expect(TOPICS.length).toBeGreaterThan(3)
    expect(GENRES.length).toBeGreaterThan(3)
    for (const k of ALL_KEYS) {
      const p = ERA_PROGRAMS[k]
      expect(p.journalQuestion.length, k).toBeGreaterThan(10)
      if (p.motivationTopic) expect(TOPICS, `${k} topic`).toContain(p.motivationTopic)
      if (p.musicGenre) expect(GENRES, `${k} genre`).toContain(p.musicGenre)
      for (const c of p.quoteCategories ?? []) expect(CATEGORIES.has(c), `${k} quote category ${c}`).toBe(true)
    }
  })

  it('every preset era leans somewhere; custom only asks its own question', () => {
    for (const p of ERA_PRESETS) {
      expect(ERA_PROGRAMS[p.key].motivationTopic, p.key).toBeTruthy()
      expect(ERA_PROGRAMS[p.key].quoteCategories?.length, p.key).toBeGreaterThan(0)
    }
    expect(ERA_PROGRAMS.custom.motivationTopic).toBeUndefined()
  })
})

describe('eraQuote', () => {
  it('without an era it is exactly the daily mindset quote (so the push still matches)', () => {
    for (const m of MINDSET_IDS) {
      expect(eraQuote(m, '2026-09-19', undefined)).toEqual(getDailyMindsetQuote(m, '2026-09-19'))
    }
  })

  it("with an era it draws from the era's themes", () => {
    for (const m of MINDSET_IDS) {
      const q = eraQuote(m, '2026-09-19', ['resilience', 'growth'])
      const themed = MINDSET_QUOTES[m].some(x => x.category === 'resilience' || x.category === 'growth')
      if (themed) expect(['resilience', 'growth'], m).toContain(q!.category)
    }
  })

  it('falls back to the whole pool when none of the mindset’s quotes fit', () => {
    expect(eraQuote('stoic', '2026-09-19', ['no_such_category'])).toEqual(getDailyMindsetQuote('stoic', '2026-09-19'))
  })
})

describe('eraFirst and the journal prompt', () => {
  it('moves the pick to the front and hides nothing', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(eraFirst(items, 'c').map(i => i.id)).toEqual(['c', 'a', 'b'])
    expect(eraFirst(items, undefined).map(i => i.id)).toEqual(['a', 'b', 'c'])
    expect(eraFirst(items, 'zzz').map(i => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('names the day and the era', () => {
    expect(eraJournalPrompt({ key: 'locked_in', title: 'Locked In', day: 12 }))
      .toBe('Day 12 of Locked In. Where did you hold your focus today, and where did it slip?')
  })
})
