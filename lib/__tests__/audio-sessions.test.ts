import { describe, it, expect } from 'vitest'
import { audioLine, cleanAudioSession, countsAsProof, MIN_CONTEXT_SECONDS } from '@/lib/audio-sessions'

describe('audio on the record', () => {
  it('records a guide only when it was finished', () => {
    expect(cleanAudioSession({ kind: 'guide', itemId: 'breathing', title: 'Breathing', seconds: 180, completed: true })).not.toBeNull()
    expect(cleanAudioSession({ kind: 'guide', itemId: 'breathing', title: 'Breathing', seconds: 40, completed: false })).toBeNull()
  })

  it('records music and motivation only after a real sitting', () => {
    const base = { kind: 'music', itemId: 'lofi', title: 'Lo-Fi', completed: false }
    expect(cleanAudioSession({ ...base, seconds: MIN_CONTEXT_SECONDS - 1 })).toBeNull()
    expect(cleanAudioSession({ ...base, seconds: MIN_CONTEXT_SECONDS })).not.toBeNull()
  })

  it('only a finished guide makes a day count — background listening never does', () => {
    expect(countsAsProof({ kind: 'guide', completed: true })).toBe(true)
    expect(countsAsProof({ kind: 'music', completed: true })).toBe(false)
    expect(countsAsProof({ kind: 'motivation', completed: true })).toBe(false)
  })

  it('rejects anything malformed', () => {
    expect(cleanAudioSession(null)).toBeNull()
    expect(cleanAudioSession({ kind: 'podcast', itemId: 'x', title: 'x', seconds: 900, completed: false })).toBeNull()
    expect(cleanAudioSession({ kind: 'music', itemId: '', title: 'x', seconds: 900, completed: false })).toBeNull()
    expect(cleanAudioSession({ kind: 'music', itemId: 'x', title: 'x', seconds: 100_000, completed: false })).toBeNull()
  })

  it('says it plainly', () => {
    expect(audioLine({ kind: 'guide', title: 'Breathing', seconds: 180, completed: true })).toBe('Breathing · finished')
    expect(audioLine({ kind: 'music', title: 'Lo-Fi', seconds: 3120, completed: false })).toBe('52 min of Lo-Fi')
    expect(audioLine({ kind: 'motivation', title: 'Focus motivation', seconds: 1080, completed: false })).toBe('Focus motivation · 18 min')
  })
})
