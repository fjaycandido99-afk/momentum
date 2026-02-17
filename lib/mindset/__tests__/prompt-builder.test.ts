import { describe, it, expect } from 'vitest'
import { buildMindsetSystemPrompt, getMindsetPromptModifier } from '../prompt-builder'

describe('getMindsetPromptModifier', () => {
  it('returns modifier with framework for stoic', () => {
    const result = getMindsetPromptModifier('stoic')
    expect(result).toContain('PHILOSOPHICAL FRAMEWORK')
    expect(result).toContain('Stoic')
    expect(result).toContain('TONE:')
    expect(result).toContain('Marcus Aurelius')
  })

  it('returns modifier for each mindset', () => {
    const mindsets = ['stoic', 'existentialist', 'cynic', 'hedonist', 'samurai', 'scholar'] as const
    for (const id of mindsets) {
      const result = getMindsetPromptModifier(id)
      expect(result).toBeTruthy()
      expect(result).toContain('PHILOSOPHICAL FRAMEWORK')
    }
  })

  it('returns empty string for invalid mindset', () => {
    // @ts-expect-error Testing invalid input
    expect(getMindsetPromptModifier('invalid')).toBe('')
  })
})

describe('buildMindsetSystemPrompt', () => {
  const basePrompt = 'You are a helpful AI coach.'

  it('appends mindset modifier to base prompt', () => {
    const result = buildMindsetSystemPrompt(basePrompt, 'stoic')
    expect(result).toContain(basePrompt)
    expect(result).toContain('PHILOSOPHICAL FRAMEWORK')
    expect(result).toContain('Stoic')
  })

  it('returns base prompt when mindsetId is null', () => {
    expect(buildMindsetSystemPrompt(basePrompt, null)).toBe(basePrompt)
  })

  it('returns base prompt when mindsetId is undefined', () => {
    expect(buildMindsetSystemPrompt(basePrompt, undefined)).toBe(basePrompt)
  })

  it('returns base prompt for invalid mindsetId', () => {
    // @ts-expect-error Testing invalid input
    expect(buildMindsetSystemPrompt(basePrompt, 'invalid')).toBe(basePrompt)
  })

  it('includes thinker references for samurai', () => {
    const result = buildMindsetSystemPrompt(basePrompt, 'samurai')
    expect(result).toContain('Miyamoto Musashi')
  })

  it('includes thinker references for scholar', () => {
    const result = buildMindsetSystemPrompt(basePrompt, 'scholar')
    expect(result).toContain('Carl Jung')
  })
})
