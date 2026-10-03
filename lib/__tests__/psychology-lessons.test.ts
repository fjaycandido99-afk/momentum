import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'
import {
  LESSON_BY_ID, LESSON_FOR_EXPERIMENT, LESSON_FOR_PATTERN, LESSON_GROUPS, LESSONS,
} from '@/lib/psychology/lessons'

const text = (l: (typeof LESSONS)[number]) =>
  [l.title, l.line, ...l.body, l.tryThis.text, ...(l.loop ? Object.values(l.loop) : [])].join(' ')

describe('psychology library', () => {
  it('has unique ids and every lesson in a known group', () => {
    expect(new Set(LESSONS.map(l => l.id)).size).toBe(LESSONS.length)
    const groups = new Set(LESSON_GROUPS.map(g => g.key))
    for (const l of LESSONS) expect(groups.has(l.group)).toBe(true)
  })

  it('rests every lesson on a dated, findable source with a stated finding', () => {
    for (const l of LESSONS) {
      expect(l.sources.length, l.id).toBeGreaterThan(0)
      for (const s of l.sources) {
        expect(s.cite, l.id).toMatch(/\((19|20)\d{2}\)/)
        expect(s.finding.length, l.id).toBeGreaterThan(20)
      }
    }
  })

  it('never labels the reader or reaches for a diagnosis', () => {
    const banned = /\b(adhd|anxiety disorder|depress\w*|narcissis\w*|bipolar|ocd|disorder|diagnos(e|ed)|you are a|you're a|lazy|proven|guarantee\w*)\b/i
    for (const l of LESSONS) expect(text(l), l.id).not.toMatch(banned)
  })

  it('keeps lessons short', () => {
    for (const l of LESSONS) {
      expect(l.body.length, l.id).toBeLessThanOrEqual(3)
      expect(l.line.length, l.id).toBeLessThanOrEqual(130)
    }
  })

  it('only links to lessons and pages that exist', () => {
    for (const id of [...Object.values(LESSON_FOR_PATTERN), ...Object.values(LESSON_FOR_EXPERIMENT)]) {
      expect(LESSON_BY_ID.has(id!), id).toBe(true)
    }
    for (const l of LESSONS) {
      const href = l.tryThis.href
      if (!href || href === '/') continue
      expect(existsSync(join(process.cwd(), 'app', '(dashboard)', href.slice(1), 'page.tsx')), href).toBe(true)
    }
  })
})
