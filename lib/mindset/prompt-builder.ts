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
  mindsetId: MindsetId | null | undefined,
  /**
   * What to call them (lib/user/display-name.ts). Passed in rather than
   * looked up here so this stays a pure prompt builder — and left out
   * entirely when they haven't set a name, so the model can't invent one.
   */
  displayName?: string | null,
): string {
  const named = displayName
    ? `${basePrompt}\n\nTheir name is ${displayName}. Use it where it lands — a greeting, a hard truth, the moment that matters — and not in every sentence. Never guess at any other name.`
    : basePrompt

  if (!mindsetId) return named

  const modifier = getMindsetPromptModifier(mindsetId)
  if (!modifier) return named

  return `${named}\n\n${modifier}`
}
