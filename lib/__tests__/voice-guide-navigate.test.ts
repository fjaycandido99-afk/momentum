import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'
import { DESTINATIONS, navHref, resolveNav } from '@/lib/voice-guide/navigate'

const go = (text: string, ctx = {}) => {
  const r = resolveNav(text, ctx)
  return r.kind === 'go' ? navHref(r) : null
}

describe('voice guide navigation', () => {
  it('takes the phrases from the concept to the right place', () => {
    expect(go('Take me to my Era')).toBe('/era')
    expect(go('Show me today\'s promise')).toBe('/')
    expect(go('Open my Laws.')).toBe('/patterns?spot=laws-title')
    expect(go('Show me the experiment you mentioned')).toBe('/patterns?spot=laws-experiments')
    expect(go('Take me to the lesson about procrastination')).toBe('/psychology/planning-fallacy')
    expect(go('Show me my recent pattern')).toBe('/patterns?spot=laws-title')
    expect(go('Open the journal')).toBe('/journal')
  })

  it('goes to a lesson by its title', () => {
    expect(go('take me to the planning fallacy')).toBe('/psychology/planning-fallacy')
    expect(go('open small wins')).toBe('/psychology/small-wins')
  })

  it('prefers the longer, more specific phrase', () => {
    expect(go('what\'s today\'s mission')).toBe('/era')
    expect(go('I missed yesterday, explain why that happens')).toBe('/psychology/the-miss-loop')
  })

  it('reads "show me" as this screen\'s next step — and only that', () => {
    const next = { say: 'Here are the experiments.', href: '/patterns', spot: 'laws-experiments' }
    expect(go('Show me', { next })).toBe('/patterns?spot=laws-experiments')
    expect(go('what should I press?', { next })).toBe('/patterns?spot=laws-experiments')
    expect(resolveNav('show me').kind).toBe('unknown')
  })

  it('matches whole words only', () => {
    // "operate" contains "era"; "worked" contains no place.
    expect(resolveNav('how does this operate').kind).toBe('unknown')
  })

  it('says where it can go when it does not know', () => {
    const r = resolveNav('banana')
    expect(r.kind).toBe('unknown')
    expect(r.say).toMatch(/era.*laws/)
  })

  it('only ever sends people to pages that exist', () => {
    for (const d of DESTINATIONS) {
      const path = d.href === '/' ? 'page.tsx' : join(d.href.slice(1), 'page.tsx')
      expect(existsSync(join(process.cwd(), 'app', '(dashboard)', path)), d.href).toBe(true)
    }
  })
})
