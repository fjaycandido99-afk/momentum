import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Scrolling has broken again and again in Voxu. The rule that holds: a page
 * scrolls INSIDE an app shell (`data-app-shell`, sized to the screen), never
 * the document. A document-scrolling page with a `min-h-screen` root
 * overflowed by the layout's padding and scrolled with nothing below it, and
 * on iOS the document rubber-bands the whole screen, header and all.
 */
const root = path.join(process.cwd(), 'app/(dashboard)')

function pages(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? pages(p) : e.name === 'page.tsx' ? [p] : []
  })
}

/** Pages that render another screen or no scrolling content of their own. */
const EXEMPT: Record<string, string> = {
  'page.tsx': 'Home: ImmersiveHome owns its scroll container',
  'coach/page.tsx': 'redirect',
  'daily-guide/page.tsx': 'redirect (loading screen)',
  'daily-guide/onboarding/page.tsx': 'onboarding flow, no chrome',
  'mindset-selection/page.tsx': 'MindsetSelectionScreen, no chrome',
  'era/wake/page.tsx': 'a fixed full-screen alarm, nothing to scroll',
}

describe('page scrolling', () => {
  const all = pages(root).map(p => path.relative(root, p).split(path.sep).join('/'))

  it('found the pages', () => {
    expect(all.length).toBeGreaterThanOrEqual(15)
  })

  it('every page scrolls inside an app shell', () => {
    for (const rel of all) {
      if (EXEMPT[rel]) continue
      const src = fs.readFileSync(path.join(root, rel), 'utf8')
      expect(src.includes('data-app-shell'), `${rel} has no data-app-shell`).toBe(true)
    }
  })

  it('no page roots itself on min-h-screen', () => {
    for (const rel of all) {
      if (EXEMPT[rel]) continue
      const src = fs.readFileSync(path.join(root, rel), 'utf8')
      expect(/className="[^"]*\bmin-h-screen\b/.test(src.replace(/fallback=\{[^}]*\}/g, '')), `${rel} uses min-h-screen`).toBe(false)
    }
  })

  it('the layout adds no mobile bottom padding under the pages', () => {
    const layout = fs.readFileSync(path.join(root, 'layout.tsx'), 'utf8')
    expect(layout).not.toMatch(/'pb-16'/)
  })
})
