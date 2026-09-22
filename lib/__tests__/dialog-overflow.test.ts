import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Every modal panel has to be guarded against sideways scroll.
 *
 * `overflow-y-auto` does NOT leave the other axis alone — per spec, when one
 * axis is not `visible` the other computes to `auto`. So a panel that scrolls
 * vertically will also scroll horizontally the moment anything inside it is a
 * pixel too wide, and a sheet that slides sideways under your thumb feels
 * broken in a way that is hard to describe and easy to notice.
 *
 * This bit the app once already: ten sheets shared a header whose close button
 * had `-mr-1`, which pushed 4px past the content box and made every one of
 * them a horizontal scroller. Rather than trust that nobody re-introduces it,
 * this test reads the source and requires the pairing.
 */

function tsxFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...tsxFiles(path))
    else if (entry.endsWith('.tsx')) out.push(path)
  }
  return out
}

const files = [...tsxFiles('components'), ...tsxFiles('app')]

describe('modal panels', () => {
  it('pairs every scrolling panel with overflow-x-hidden', () => {
    const offenders: string[] = []

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      // Only files that actually present a dialog — a page that scrolls is
      // allowed to be its own thing.
      if (!source.includes('role="dialog"')) continue

      for (const line of source.split('\n')) {
        if (!line.includes('overflow-y-auto')) continue
        if (line.includes('overflow-x-hidden')) continue
        offenders.push(`${file}: ${line.trim().slice(0, 80)}`)
      }
    }

    expect(offenders, `unguarded scrolling panels:\n${offenders.join('\n')}`).toEqual([])
  })

  it('has no negative right margin inside a dialog', () => {
    // The original cause. A negative margin on a header button pushes past
    // the panel's content box, and the panel turns into a scroller.
    const offenders: string[] = []

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      if (!source.includes('role="dialog"')) continue
      for (const line of source.split('\n')) {
        if (/\s-mr-\d/.test(line)) offenders.push(`${file}: ${line.trim().slice(0, 80)}`)
      }
    }

    expect(offenders, `negative right margins in a dialog:\n${offenders.join('\n')}`).toEqual([])
  })

  it('found some dialogs to check, so the test cannot pass by finding nothing', () => {
    const dialogs = files.filter(f => readFileSync(f, 'utf8').includes('role="dialog"'))
    expect(dialogs.length).toBeGreaterThan(5)
  })
})
