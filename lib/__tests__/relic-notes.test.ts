import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cleanRelicNote, NOTE_MAX } from '@/lib/relic-notes'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('relic memory notes', () => {
  it('keeps one trimmed line under the cap, and empty clears it', () => {
    expect(cleanRelicNote('  the month\n reading   stuck ')).toBe('the month reading stuck')
    expect(cleanRelicNote('x'.repeat(NOTE_MAX + 40))).toHaveLength(NOTE_MAX)
    expect(cleanRelicNote('   ')).toBeNull()
    expect(cleanRelicNote(42)).toBeNull()
  })

  it('never reaches anything other people see', () => {
    // Circles, the share card and the admin totals read coins, never notes.
    for (const file of [
      'lib/era/circle-server.ts',
      'lib/relic-card.tsx',
      'app/api/relics/card/route.tsx',
      'lib/analytics/growth-server.ts',
    ]) {
      expect(read(file), file).not.toMatch(/\bnote(_at)?\s*:\s*true/)
    }
  })

  it('is in their data export', () => {
    expect(read('app/api/account/export/route.ts')).toMatch(/userAchievement\.findMany[\s\S]{0,200}note: true/)
  })
})
