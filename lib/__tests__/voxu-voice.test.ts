import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

describe('Voxu has its own voice', () => {
  const utils = read('lib/daily-guide/audio-utils.ts')
  const chat = read('app/api/ai/chat-voice/route.ts')

  it('is defined once, overridable from the environment', () => {
    expect(utils).toContain("export const VOXU_VOICE_ID = process.env.VOXU_VOICE_ID || 'ahz6lhTYyJtfoR5eZpUg'")
  })

  it('is what Voxu speaks in — the coach and the wake-up call', () => {
    expect(chat).toContain('generateAudio(text, tone, TTS_CHAT_BUDGET_KEY, VOXU_VOICE_ID)')
    // Nothing cached in the old tone voices is replayed as Voxu.
    expect(chat).toContain('-voxu-${VOXU_VOICE_ID}-')
  })

  it('leaves guided sessions on their three instructor voices', () => {
    const cache = read('lib/daily-guide/audio-cache.ts')
    expect(cache).toContain('TONE_VOICES[tone] || TONE_VOICES.calm')
    expect(cache).not.toContain('VOXU_VOICE_ID')
  })

  it('falls back to the tone voice rather than going silent if the voice is rejected', () => {
    expect(utils).toMatch(/voiceOverride && !response\.ok/)
  })
})
