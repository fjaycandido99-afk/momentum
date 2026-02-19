export type MindsetId = 'stoic' | 'existentialist' | 'cynic' | 'hedonist' | 'samurai' | 'scholar' | 'manifestor' | 'hustler'

export interface MindsetConfig {
  id: MindsetId
  name: string
  subtitle: string
  description: string
  icon: string
  /** AI system prompt: philosophical framework & thinkers to reference */
  promptPersonality: string
  /** AI system prompt: tone of voice */
  promptTone: string
  /** Key thinkers / texts the AI should draw from */
  promptReferences: string[]
  /** Background animation IDs this mindset rotates through */
  backgroundPool: string[]
  /** Only Scholar mindset enables astrology features */
  astrologyEnabled: boolean
  /** Mindset-themed name for the coach feature */
  coachName: string
  /** Mindset-themed name for AI-generated reflections */
  insightName: string
  /** Mindset-themed name for guided meditation */
  meditationName: string
}

export const MINDSET_IDS: MindsetId[] = [
  'stoic',
  'existentialist',
  'cynic',
  'hedonist',
  'samurai',
  'scholar',
  'manifestor',
  'hustler',
]
