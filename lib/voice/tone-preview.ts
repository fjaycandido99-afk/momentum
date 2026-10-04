import type { GuideTone } from '@/lib/ai/voice-tone'

/**
 * Settings › Voxu Voice › Tone preview — the same moment, in each tone's
 * words. Voiced once by that tone's narrator (app/api/voice/tone-preview).
 * Changing a line? Bump TONE_PREVIEW_VERSION so it's voiced again.
 */
export const TONE_PREVIEW_LINES: Record<GuideTone, string> = {
  calm: 'Take a breath... There’s no rush today. Let’s just find the one small thing that matters, and start there.',
  direct: 'Here’s the plan. One promise, one step, right now. You know what it is. Go do it.',
  neutral: 'Let’s look at today. Pick the one thing that matters most, and we’ll take it from there.',
}
export const TONE_PREVIEW_VERSION = 1
