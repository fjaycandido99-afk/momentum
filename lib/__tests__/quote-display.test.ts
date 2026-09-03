import { describe, it, expect } from 'vitest'
import { unwrapQuoted, displayAuthor } from '@/lib/quotes'

describe('unwrapQuoted', () => {
  it('removes the stored wrapping so the card is not double-quoted', () => {
    // Exactly what the Saved page rendered before:
    //   ""If you look at what you have in life…" — Oprah Winfrey"
    expect(unwrapQuoted('"If you look at what you have in life, you\'ll always have more." — Oprah Winfrey'))
      .toBe("If you look at what you have in life, you'll always have more. — Oprah Winfrey")
  })

  it('handles curly quotes as well as straight ones', () => {
    expect(unwrapQuoted('“Great things never come from comfort zones.” — Anon'))
      .toBe('Great things never come from comfort zones. — Anon')
  })

  it('leaves unquoted text alone', () => {
    expect(unwrapQuoted('Having a quiet morning')).toBe('Having a quiet morning')
    expect(unwrapQuoted('')).toBe('')
  })

  it('does not mangle a quote mark used mid-sentence', () => {
    expect(unwrapQuoted('she said "no" and meant it')).toBe('she said "no" and meant it')
  })
})

describe('displayAuthor', () => {
  it('hides filler attributions', () => {
    expect(displayAuthor('Unknown')).toBeNull()
    expect(displayAuthor('  ')).toBeNull()
    expect(displayAuthor('Jocko Willink')).toBe('Jocko Willink')
  })
})
