import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const src = fs.readFileSync(path.join(process.cwd(), 'components/home/MorningBriefCard.tsx'), 'utf8')

describe('morning brief', () => {
  it('speaks the wake-up call’s own script, so the two never disagree', () => {
    expect(src).toContain("fetch('/api/era/wake'")
    expect(src).toContain('d.call.script')
  })

  it('plays only for premium — a personal script cannot be shared through the cache', () => {
    expect(src).toMatch(/premium \? \(\s*<SpeakReplyButton/)
    expect(src).toContain('openUpgradeModal()')
  })

  it('is a morning card, dismissible for the day, and never fetches outside the morning', () => {
    expect(src).toContain('if (h < 5 || h >= 12 || isDismissed(DISMISS_ID)) return')
    expect(src).toContain("setDismissed(DISMISS_ID, 'today')")
  })
})
