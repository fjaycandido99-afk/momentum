/**
 * The user's Voice Tone setting (Settings → Daily Experience), applied to
 * written AI replies as well as spoken ones.
 *
 * Until now this setting only picked an ElevenLabs voice for guided audio
 * (TONE_VOICES in lib/daily-guide/audio-utils.ts). The chat ignored it
 * entirely and read only the user's mindset — so someone who explicitly
 * chose "Direct" still got soft, gentle questioning. That was the bug.
 *
 * Deliberately kept separate from the mindset modifier, which already
 * emits its own `TONE:` line describing a philosophical voice. This one
 * is about DELIVERY — length, directness, warmth — and is appended after
 * the mindset block so that when the two pull against each other, the
 * setting the user actually chose by hand wins.
 */

export type GuideTone = 'calm' | 'direct' | 'neutral'

export const GUIDE_TONES: GuideTone[] = ['calm', 'direct', 'neutral']

export function isGuideTone(value: unknown): value is GuideTone {
  return typeof value === 'string' && (GUIDE_TONES as string[]).includes(value)
}

const DELIVERY: Record<GuideTone, string> = {
  // Labels mirror the settings UI: "Soft and gentle".
  calm: `DELIVERY — Calm (the user chose this):
- Unhurried and soft. Let a sentence breathe rather than packing it.
- Warmth before insight. It is fine to simply sit with what they said.
- Prefer gentle invitations ("if you want to stay with that…") over instructions.`,

  // "Clear and concise".
  direct: `DELIVERY — Direct (the user chose this):
- Short, plain sentences. Say the thing; do not circle it.
- Skip the cushioning preamble. No "it sounds like you might perhaps".
- Name what you notice plainly, then ask one clear question.
- Being direct is not being cold — stay kind, just stop padding.`,

  // "Balanced tone".
  neutral: `DELIVERY — Neutral (the user chose this):
- Even and grounded. Neither soothing nor blunt.
- Match their register: if they are brisk, be brisk; if heavy, slow down.
- Plain language, no therapeutic jargon and no performed cheerfulness.`,
}

/**
 * Appends the delivery block to a system prompt. Unknown or missing tones
 * pass the prompt through untouched rather than guessing.
 */
export function applyVoiceTone(prompt: string, tone: string | null | undefined): string {
  if (!isGuideTone(tone)) return prompt
  return `${prompt}\n\n${DELIVERY[tone]}`
}

export function voiceToneDelivery(tone: GuideTone): string {
  return DELIVERY[tone]
}
