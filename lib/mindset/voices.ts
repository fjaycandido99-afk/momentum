/**
 * Mindset → ElevenLabs voice mapping.
 *
 * Each mindset has a persona (Sage, Commander, Challenger, etc.) with a
 * distinctive tone — calm, intense, blunt. The voice the AI speaks in
 * for Voice Journal (and any future spoken-AI surface) should match
 * the persona, not default to a generic warm voice for everyone.
 *
 * Voice IDs are the same ones already in TONE_VOICES
 * (lib/daily-guide/audio-utils.ts) — the ElevenLabs identities the
 * Daily Guide audio already uses, so there's no new TTS cost line and
 * the user hears a consistent set of voices across the whole app.
 */

import type { MindsetId } from './types'

// IDs come from TONE_VOICES — keep in sync if those ever change.
const VOICE_CALM = 'jguI6DAHl2kb9EpGEjEx'      // measured, soothing, mentor
const VOICE_NEUTRAL = 'flHkNRp1BlvT73UL6gyz'   // balanced, grounded
const VOICE_DIRECT = 'goT3UYdM9bhm0n2lmKQx'    // sharp, intense, no fluff

export const MINDSET_VOICES: Record<MindsetId, string> = {
  stoic:         VOICE_CALM,     // The Sage — measured + unwavering
  existentialist: VOICE_NEUTRAL, // The Guide — poetic + grounded
  cynic:         VOICE_DIRECT,   // The Challenger — blunt + witty
  hedonist:      VOICE_CALM,     // calm savoring tone
  samurai:       VOICE_DIRECT,   // disciplined + sharp
  scholar:       VOICE_NEUTRAL,  // analytical + measured
  manifestor:    VOICE_CALM,     // visionary + warm
  hustler:       VOICE_DIRECT,   // The Commander — direct + intense
}

export function getMindsetVoiceId(mindsetId: MindsetId | null | undefined): string {
  if (!mindsetId) return VOICE_CALM
  return MINDSET_VOICES[mindsetId] || VOICE_CALM
}
