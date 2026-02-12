import type { MindsetId } from './types'
import { MINDSET_CONFIGS } from './configs'

/**
 * Returns the philosophical framework + tone modifier for a given mindset.
 * Used to inject mindset context into any AI system prompt.
 */
export function getMindsetPromptModifier(mindsetId: MindsetId): string {
  const config = MINDSET_CONFIGS[mindsetId]
  if (!config) return ''

  return `
PHILOSOPHICAL FRAMEWORK — ${config.name}:
${config.promptPersonality}

TONE: ${config.promptTone}

Draw from these thinkers/traditions (subtly, without name-dropping unless quoting):
${config.promptReferences.join(', ')}
`.trim()
}

/**
 * Composes a mindset-aware system prompt by appending the mindset modifier
 * to an existing base system prompt.
 *
 * Called from all AI routes — single source of truth for mindset injection.
 */
export function buildMindsetSystemPrompt(
  basePrompt: string,
  mindsetId: MindsetId | null | undefined
): string {
  if (!mindsetId) return basePrompt

  const modifier = getMindsetPromptModifier(mindsetId)
  if (!modifier) return basePrompt

  return `${basePrompt}\n\n${modifier}`
}
