import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const src = fs.readFileSync(path.join(process.cwd(), 'components/home/NavSheet.tsx'), 'utf8')
const hrefs = [...src.matchAll(/href: '(\/[a-z-]+)'/g)].map(m => m[1])

describe('the menu', () => {
  it('found its links', () => {
    expect(hrefs.length).toBeGreaterThanOrEqual(8)
  })

  for (const href of hrefs) {
    it(`${href} exists`, () => {
      const page = path.join(process.cwd(), 'app', '(dashboard)', href.slice(1), 'page.tsx')
      expect(fs.existsSync(page), page).toBe(true)
    })
  }

  it('never shows a status nothing measures', () => {
    // The mockup had "↑ 12%" and "On track". Statuses here are counts the
    // app has (Pulse, the era, today's journal) — never a trend or a grade.
    // Only what a status line can SAY — the status expressions. (The era
    // bar's CSS width is a percentage, and is not a claim.)
    const statuses = [...src.matchAll(/status: ([^\n]+)/g)].map(m => m[1]).join('\n')
    expect(statuses.length).toBeGreaterThan(0)
    expect(statuses).not.toMatch(/↑|On track|%/)
  })
})
