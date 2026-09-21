/**
 * Mindset attributes — the mental skills an era trains.
 *
 * These exist so every piece of content has to answer one question: what
 * does this train? A breathing exercise belongs in Voxu because it trains
 * staying calm under pressure, not because every wellness app has breathing.
 *
 * What these are NOT is a score. There is no "Discipline 62" here and there
 * will not be one: nothing in this app measures discipline, it counts
 * promises, and a number someone reads as a verdict on their character can
 * do real harm — the same reason lib/wellness/scales.ts refuses to compute a
 * mood score. Attributes are LABELS, and anything reported about them is a
 * count with its denominator in view ("9 of 12 focus exercises finished").
 *
 * KEYS are the contract — they're stored on exercise rows. Relabel freely,
 * never rename.
 */

export type AttributeId =
  | 'discipline'
  | 'focus'
  | 'consistency'
  | 'resilience'
  | 'confidence'
  | 'courage'
  | 'self_control'
  | 'emotional_control'
  | 'patience'
  | 'detachment'
  | 'perspective'
  | 'self_belief'

export interface Attribute {
  id: AttributeId
  label: string
  /** What it means here, in the second person. One line, no jargon. */
  meaning: string
}

export const ATTRIBUTES: Attribute[] = [
  { id: 'discipline', label: 'Discipline', meaning: 'Doing it when the feeling to do it never arrives.' },
  { id: 'focus', label: 'Focus', meaning: 'Staying on one thing long enough for it to count.' },
  { id: 'consistency', label: 'Consistency', meaning: 'Showing up again, especially after a bad day.' },
  { id: 'resilience', label: 'Resilience', meaning: 'Getting back to it faster than last time.' },
  { id: 'confidence', label: 'Confidence', meaning: 'Acting before you feel ready.' },
  { id: 'courage', label: 'Courage', meaning: 'Doing the thing you are avoiding.' },
  { id: 'self_control', label: 'Self-control', meaning: 'Feeling the urge and not following it.' },
  { id: 'emotional_control', label: 'Emotional control', meaning: 'Choosing your response instead of reacting.' },
  { id: 'patience', label: 'Patience', meaning: 'Staying with something slow without quitting it.' },
  { id: 'detachment', label: 'Detachment', meaning: 'Letting go of what was never yours to hold.' },
  { id: 'perspective', label: 'Perspective', meaning: 'Seeing the thing at its real size.' },
  { id: 'self_belief', label: 'Self-belief', meaning: 'Trusting your own word to yourself.' },
]

export const ATTRIBUTES_BY_ID = new Map(ATTRIBUTES.map(a => [a.id, a]))

export function attributeLabel(id: string): string {
  return ATTRIBUTES_BY_ID.get(id as AttributeId)?.label ?? id
}

/**
 * What each era trains — two or three, in order of weight.
 *
 * No percentages. "Discipline 40% / Focus 35% / Consistency 25%" would be a
 * design decision dressed as a measurement; the order says the same thing
 * and claims nothing it can't back.
 *
 * Keys are era keys from lib/era/presets.ts.
 */
export const ERA_ATTRIBUTES: Record<string, AttributeId[]> = {
  locked_in: ['focus', 'discipline', 'consistency'],
  discipline: ['discipline', 'consistency', 'self_control'],
  comeback: ['resilience', 'consistency', 'self_belief'],
  gym_arc: ['discipline', 'consistency', 'self_belief'],
  stoic_mode: ['emotional_control', 'perspective', 'detachment'],
  confidence: ['confidence', 'courage', 'self_belief'],
  study: ['focus', 'patience', 'consistency'],
  five_am: ['discipline', 'consistency', 'self_control'],
  custom: ['consistency', 'discipline', 'focus'],
}

export function attributesForEra(eraKey: string | null | undefined): AttributeId[] {
  return ERA_ATTRIBUTES[eraKey ?? 'custom'] ?? ERA_ATTRIBUTES.custom
}
