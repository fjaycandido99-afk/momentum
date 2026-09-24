import { describe, it, expect } from 'vitest'
import { firstJsonObject, parseModelJson } from '@/lib/ai/json'

describe('finding the object in a model reply', () => {
  it('takes a bare object', () => {
    expect(firstJsonObject('{"a":1}')).toBe('{"a":1}')
  })

  it('ignores what comes before and after', () => {
    // "Here you go:" is not a refusal, it is a wrapper.
    expect(firstJsonObject('Here you go:\n{"a":1}\nHope that helps!')).toBe('{"a":1}')
  })

  it('handles nesting', () => {
    expect(firstJsonObject('{"a":{"b":{"c":1}}}')).toBe('{"a":{"b":{"c":1}}}')
  })

  it('is not fooled by a brace inside a string', () => {
    // The reason this counts depth instead of using a regex: a summary that
    // mentions a "}" would break a lazy match, and a greedy one would
    // swallow trailing prose.
    const raw = '{"about":"it uses a { character"} trailing'
    expect(firstJsonObject(raw)).toBe('{"about":"it uses a { character"}')
  })

  it('honours escapes inside strings', () => {
    const raw = '{"about":"a quote \\" then }"} after'
    expect(firstJsonObject(raw)).toBe('{"about":"a quote \\" then }"}')
  })

  it('returns null when there is no object', () => {
    expect(firstJsonObject('no json here')).toBeNull()
    expect(firstJsonObject('')).toBeNull()
    expect(firstJsonObject('{"unclosed": 1')).toBeNull()
  })
})

describe('parsing what models actually send', () => {
  it('parses clean JSON', () => {
    expect(parseModelJson('{"unknown":true}')).toEqual({ unknown: true })
  })

  it('unwraps a fence nobody asked for', () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(parseModelJson('```\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it('digs the object out of surrounding chatter', () => {
    expect(parseModelJson('Sure!\n{"a":1}\nLet me know.')).toEqual({ a: 1 })
  })

  it('handles the reasoning-model shape: thinking, then the answer', () => {
    const raw = 'The book is about habits, so about should mention systems.\n\n{"about":"x","forYourEra":"y"}'
    expect(parseModelJson(raw)).toEqual({ about: 'x', forYourEra: 'y' })
  })

  it('returns null instead of throwing', () => {
    // Every caller has to handle "no usable answer" anyway; an exception
    // here would turn a bad reply into a 500.
    expect(parseModelJson('not json at all')).toBeNull()
    expect(parseModelJson('')).toBeNull()
    expect(parseModelJson(null)).toBeNull()
    expect(parseModelJson(undefined)).toBeNull()
    expect(parseModelJson('{"broken": ')).toBeNull()
  })

  it('refuses a bare scalar, which is not an answer shape', () => {
    expect(parseModelJson('42')).toBeNull()
    expect(parseModelJson('"just a string"')).toBeNull()
    expect(parseModelJson('null')).toBeNull()
  })
})
