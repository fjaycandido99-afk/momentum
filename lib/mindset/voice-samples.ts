import type { MindsetId } from './types'

/**
 * What a mindset sounds like, for the mindset picker and detail page.
 *
 * With eras, a mindset is the VOICE the coach speaks in, so the clearest way
 * to explain one is to let people hear it: every mindset answers the SAME
 * promise, so switching between them shows the difference directly.
 *
 * These are written, not generated — they're the product's promise about
 * each voice, and they have to stay true to lib/mindset/configs.ts
 * promptPersonality / promptTone.
 */

export const SAMPLE_PROMISE = "I'll finish the thing I've been avoiding."

export interface MindsetVoice {
  /** Short line under the name on the picker card. */
  tagline: string
  /** How this coach answers SAMPLE_PROMISE. */
  reply: string
  /** Era keys (lib/era/presets.ts) this voice suits. */
  pairsWith: string[]
}

export const MINDSET_VOICES: Record<MindsetId, MindsetVoice> = {
  stoic: {
    tagline: 'Unshakable calm',
    reply: "You can't control how the day goes. You can control whether you start. Begin before you feel ready — that part is yours.",
    pairsWith: ['stoic_mode', 'comeback', 'locked_in'],
  },
  existentialist: {
    tagline: 'Radical freedom',
    reply: "No one is coming to make this matter. It matters because you choose it — so choose it today, by doing it.",
    pairsWith: ['comeback', 'confidence', 'locked_in'],
  },
  cynic: {
    tagline: 'Raw truth',
    reply: "You've been 'about to' for weeks. Skip the ceremony. Open it, do the ugly first ten minutes, and it's already smaller.",
    pairsWith: ['locked_in', 'discipline'],
  },
  hedonist: {
    tagline: 'Savor life',
    reply: 'Get it done early, then enjoy the rest of the day without it hanging over you. That lightness is the real reward.',
    pairsWith: ['comeback', 'confidence'],
  },
  samurai: {
    tagline: 'Honor & discipline',
    reply: 'A warrior does not negotiate with the task. Draw the blade early. Finish it before noon, then rest with honor.',
    pairsWith: ['discipline', 'gym_arc', 'five_am'],
  },
  scholar: {
    tagline: 'Cosmic wisdom',
    reply: 'Avoidance is usually uncertainty in disguise. Name the first thing you don\'t know, answer it, and the rest will follow.',
    pairsWith: ['study', 'stoic_mode'],
  },
  manifestor: {
    tagline: 'Create your reality',
    reply: "See it already done — the relief, the lighter afternoon. Now walk toward that picture, one small step at a time.",
    pairsWith: ['confidence', 'comeback'],
  },
  hustler: {
    tagline: 'Outwork everyone',
    reply: "Nobody cares that you don't feel like it — including you. Phone away, first thing, get after it. Done beats perfect.",
    pairsWith: ['locked_in', 'gym_arc', 'five_am'],
  },
}
