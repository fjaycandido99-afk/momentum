import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { clipForVoice, VOXU_MAX_CHARS } from '@/lib/voice/voxu-audio'

describe('Voxu speaking goes one way', () => {
  it('clips long text to the voice cap at a sentence end', () => {
    const long = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} is here.`).join(' ')
    const out = clipForVoice(long)
    expect(out.length).toBeLessThan(VOXU_MAX_CHARS)
    expect(out.endsWith('.')).toBe(true)
  })

  it('leaves short text alone', () => {
    expect(clipForVoice('  You kept it.  ')).toBe('You kept it.')
  })

  it('no live component speaks through the unmetered /api/tts path', () => {
    const journal = fs.readFileSync(path.join(process.cwd(), 'components/journal/VoiceJournalMode.tsx'), 'utf8')
    expect(journal).not.toContain("'/api/tts'")
    expect(journal).toContain('fetchVoxuAudio')
  })

  it('the generic TTS route is capped and rate-limited', () => {
    const tts = fs.readFileSync(path.join(process.cwd(), 'app/api/tts/route.ts'), 'utf8')
    expect(tts).toContain('rateLimit(`tts:${user.id}`')
    expect(tts).toContain('text.length > MAX_CHARS')
  })
})
