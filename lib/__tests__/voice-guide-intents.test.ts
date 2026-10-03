import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'
import { resolveIntent } from '@/lib/voice-guide/intents'
import { EXPERIMENTS } from '@/lib/patterns/experiments'

const href = (text: string, ctx = {}) => {
  const r = resolveIntent(text, ctx)
  return r.kind === 'go' ? r.href : r.kind
}

describe('voice guide actions', () => {
  it('sets up a named experiment — by opening its setup screen, never starting it', () => {
    expect(href('start keep it small')).toBe('/patterns/experiment/small_promise')
    expect(href('let\'s try the morning promise')).toBe('/patterns/experiment/morning_promise')
    expect(href('try guide first')).toBe('/patterns/experiment/guide_first')
  })

  it('reads "set this up for me" as the experiment this screen is about', () => {
    expect(href('Set this up for me.', { experiment: 'small_promise' })).toBe('/patterns/experiment/small_promise')
    // Nothing named and nothing on screen: the list, lit up.
    expect(href('set this up for me')).toBe('/patterns')
  })

  it('asks before making today lighter', () => {
    expect(href('make today easier')).toBe('lighter_day')
    expect(href('can you make today smaller')).toBe('lighter_day')
  })

  it('finds today\'s guided session', () => {
    expect(href('play today\'s guided session')).toBe('play_guide')
  })

  it('still navigates when nothing is an action', () => {
    expect(href('take me to my era')).toBe('/era')
    expect(href('open the lesson about procrastination')).toBe('/psychology/planning-fallacy')
  })

  it('has a setup screen for every experiment, with what it tests and how a day counts', () => {
    expect(existsSync(join(process.cwd(), 'app', '(dashboard)', 'patterns', 'experiment', '[key]', 'page.tsx'))).toBe(true)
    for (const e of EXPERIMENTS) {
      expect(e.testing.length, e.key).toBeGreaterThan(20)
      expect(e.counts, e.key).toMatch(/^A day counts when/)
    }
  })
})
