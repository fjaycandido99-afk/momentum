/**
 * Zodiac Traits Reference
 *
 * Contains personality traits, strengths, and affirmation styles
 * for each zodiac sign to personalize cosmic content.
 */

export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water'

export interface ZodiacTrait {
  element: ZodiacElement
  traits: string
  strengths: string
  challenges: string
  affirmationStyle: string
  cosmicThemes: string[]
}

export const ZODIAC_TRAITS: Record<string, ZodiacTrait> = {
  aries: {
    element: 'fire',
    traits: 'bold, courageous, pioneering, energetic, competitive',
    strengths: 'leadership, initiative, determination, confidence',
    challenges: 'impatience, impulsiveness, short temper',
    affirmationStyle: 'direct, empowering, action-oriented',
    cosmicThemes: ['courage', 'new beginnings', 'leadership', 'taking initiative'],
  },
  taurus: {
    element: 'earth',
    traits: 'steady, reliable, patient, sensual, determined',
    strengths: 'persistence, practicality, loyalty, stability',
    challenges: 'stubbornness, resistance to change, possessiveness',
    affirmationStyle: 'grounding, reassuring, comfort-focused',
    cosmicThemes: ['abundance', 'stability', 'self-worth', 'patience'],
  },
  gemini: {
    element: 'air',
    traits: 'curious, adaptable, communicative, witty, versatile',
    strengths: 'communication, learning, flexibility, social skills',
    challenges: 'inconsistency, restlessness, superficiality',
    affirmationStyle: 'playful, intellectual, variety-embracing',
    cosmicThemes: ['communication', 'curiosity', 'connections', 'learning'],
  },
  cancer: {
    element: 'water',
    traits: 'nurturing, intuitive, protective, emotional, caring',
    strengths: 'empathy, intuition, emotional intelligence, caregiving',
    challenges: 'moodiness, over-sensitivity, clinginess',
    affirmationStyle: 'gentle, nurturing, emotionally validating',
    cosmicThemes: ['emotional security', 'home', 'intuition', 'nurturing'],
  },
  leo: {
    element: 'fire',
    traits: 'confident, creative, dramatic, generous, warm-hearted',
    strengths: 'creativity, confidence, leadership, generosity',
    challenges: 'ego, need for attention, stubbornness',
    affirmationStyle: 'celebratory, confidence-boosting, radiant',
    cosmicThemes: ['self-expression', 'creativity', 'joy', 'leadership'],
  },
  virgo: {
    element: 'earth',
    traits: 'analytical, practical, detail-oriented, helpful, modest',
    strengths: 'precision, organization, problem-solving, service',
    challenges: 'perfectionism, over-criticism, worry',
    affirmationStyle: 'practical, improvement-focused, detail-aware',
    cosmicThemes: ['improvement', 'health', 'service', 'organization'],
  },
  libra: {
    element: 'air',
    traits: 'diplomatic, harmonious, fair-minded, social, artistic',
    strengths: 'balance, diplomacy, aesthetics, partnership',
    challenges: 'indecision, people-pleasing, avoidance of conflict',
    affirmationStyle: 'harmonious, beauty-focused, relationship-aware',
    cosmicThemes: ['balance', 'harmony', 'relationships', 'beauty'],
  },
  scorpio: {
    element: 'water',
    traits: 'intense, passionate, resourceful, brave, focused',
    strengths: 'transformation, depth, determination, intuition',
    challenges: 'jealousy, secrecy, controlling tendencies',
    affirmationStyle: 'deep, transformative, power-acknowledging',
    cosmicThemes: ['transformation', 'depth', 'power', 'rebirth'],
  },
  sagittarius: {
    element: 'fire',
    traits: 'adventurous, optimistic, philosophical, freedom-loving',
    strengths: 'optimism, wisdom, adventure, honesty',
    challenges: 'restlessness, bluntness, over-promising',
    affirmationStyle: 'expansive, optimistic, adventure-embracing',
    cosmicThemes: ['expansion', 'wisdom', 'adventure', 'truth'],
  },
  capricorn: {
    element: 'earth',
    traits: 'ambitious, disciplined, responsible, practical, patient',
    strengths: 'ambition, discipline, leadership, long-term planning',
    challenges: 'pessimism, rigidity, workaholic tendencies',
    affirmationStyle: 'achievement-focused, structured, goal-oriented',
    cosmicThemes: ['achievement', 'structure', 'ambition', 'mastery'],
  },
  aquarius: {
    element: 'air',
    traits: 'innovative, independent, humanitarian, original, progressive',
    strengths: 'originality, vision, humanitarianism, independence',
    challenges: 'detachment, unpredictability, stubbornness',
    affirmationStyle: 'innovative, future-focused, unique-embracing',
    cosmicThemes: ['innovation', 'community', 'uniqueness', 'vision'],
  },
  pisces: {
    element: 'water',
    traits: 'intuitive, compassionate, artistic, dreamy, sensitive',
    strengths: 'compassion, creativity, intuition, spirituality',
    challenges: 'escapism, over-sensitivity, boundary issues',
    affirmationStyle: 'dreamy, spiritually-aware, compassion-focused',
    cosmicThemes: ['intuition', 'dreams', 'compassion', 'spirituality'],
  },
}

/**
 * Get element-based affirmation context
 */
export function getElementContext(element: ZodiacElement): string {
  const contexts: Record<ZodiacElement, string> = {
    fire: 'Channel your inner fire. Your passion and energy are your superpowers.',
    earth: 'Ground yourself in the present. Your stability is your strength.',
    air: 'Let your mind soar. Your ideas and connections light the way.',
    water: 'Trust your intuition. Your emotional depth is a gift.',
  }
  return contexts[element]
}

/**
 * Get zodiac traits for a sign
 */
export function getZodiacTraits(sign: string): ZodiacTrait | null {
  return ZODIAC_TRAITS[sign.toLowerCase()] || null
}

/**
 * Get a random cosmic theme for a zodiac sign
 */
export function getRandomCosmicTheme(sign: string): string {
  const traits = getZodiacTraits(sign)
  if (!traits) return 'inner wisdom'
  const themes = traits.cosmicThemes
  return themes[Math.floor(Math.random() * themes.length)]
}
