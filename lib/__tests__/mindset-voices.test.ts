import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { MINDSET_VOICES } from '../mindset/voice-samples'
import { MINDSET_IDS } from '../mindset/types'
import { ERA_PRESETS_BY_KEY } from '../era/presets'

describe('mindset voices', () => {
  it('every mindset has a tagline, a sample reply, real era pairings and card art', () => {
    for (const id of MINDSET_IDS) {
      const v = MINDSET_VOICES[id]
      expect(v.tagline, id).toBeTruthy()
      expect(v.reply.length, id).toBeGreaterThan(20)
      expect(v.reply.length, id).toBeLessThanOrEqual(160)
      for (const k of v.pairsWith) expect(ERA_PRESETS_BY_KEY.has(k), `${id} → ${k}`).toBe(true)
      expect(existsSync(`public/portraits/cards/${id}.jpg`), id).toBe(true)
    }
  })

  it('sample replies are all different — the point is to hear the difference', () => {
    const replies = MINDSET_IDS.map(id => MINDSET_VOICES[id].reply)
    expect(new Set(replies).size).toBe(replies.length)
  })
})
