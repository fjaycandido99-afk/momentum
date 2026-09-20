import { describe, expect, it } from 'vitest'
import { cleanPreferredName, displayNameFrom, NAME_MAX } from '../user/display-name'

describe('cleanPreferredName', () => {
  it('keeps a real name, tidied', () => {
    expect(cleanPreferredName('Fjay')).toBe('Fjay')
    expect(cleanPreferredName('  Francis  Andy ')).toBe('Francis Andy')
    expect(cleanPreferredName('José')).toBe('José')
    expect(cleanPreferredName("O'Brien")).toBe("O'Brien")
    expect(cleanPreferredName('李伟')).toBe('李伟')
  })

  it('refuses things that are not names', () => {
    expect(cleanPreferredName('me@example.com')).toBeNull()
    expect(cleanPreferredName('https://voxu.app')).toBeNull()
    expect(cleanPreferredName('<script>')).toBeNull()
    expect(cleanPreferredName('a/b')).toBeNull()
    expect(cleanPreferredName('')).toBeNull()
    expect(cleanPreferredName('   ')).toBeNull()
    expect(cleanPreferredName(null)).toBeNull()
    expect(cleanPreferredName(42)).toBeNull()
  })

  it('treats an invisible name as no name', () => {
    // Zero-width space and a direction mark: blank to a reader, but a
    // non-empty string — the coach would say nothing and sound broken.
    const zeroWidth = String.fromCharCode(0x200b, 0x200e)
    expect(cleanPreferredName(zeroWidth)).toBeNull()
    expect(cleanPreferredName(`Fjay${zeroWidth}`)).toBe('Fjay')
    expect(cleanPreferredName(String.fromCharCode(10, 9, 13))).toBeNull()
  })

  it('caps the length so it stays speakable', () => {
    const long = 'Bartholomew Montgomery Fitzgerald'
    expect(cleanPreferredName(long)).toHaveLength(NAME_MAX)
  })
})

describe('displayNameFrom', () => {
  it('prefers what they chose', () => {
    expect(displayNameFrom({ preferred_name: 'Fjay', name: 'Francis Andy Jay Supsupon' })).toBe('Fjay')
  })

  it('falls back to the FIRST word of the provider name, never the whole thing', () => {
    expect(displayNameFrom({ preferred_name: null, name: 'Francis Andy Jay Supsupon' })).toBe('Francis')
  })

  it('has no name rather than a bad one', () => {
    expect(displayNameFrom({ preferred_name: null, name: null })).toBeNull()
    expect(displayNameFrom(null)).toBeNull()
    // Some providers put the email in the name field.
    expect(displayNameFrom({ preferred_name: null, name: 'fjay@example.com' })).toBeNull()
  })
})
