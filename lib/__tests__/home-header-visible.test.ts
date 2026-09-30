import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// The Explore header vanished for good once anything had played in the full
// player: it was gated on `!audioState.playingSound`, which stays set after
// the player closes (the mini player needs it). It must hide ONLY while a
// full-screen player is actually on screen.
describe('home header visibility', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'components/home/ImmersiveHome.tsx'), 'utf8')

  it('hides only under the same conditions that render the full players', () => {
    expect(src).toContain('{audioState.playingSound && fullPlayerOpen && (')
    expect(src).toContain('{audioState.activeSoundscape && audioState.showSoundscapePlayer && (')
    expect(src).toContain(
      '{!(audioState.playingSound && fullPlayerOpen) && !(audioState.activeSoundscape && audioState.showSoundscapePlayer) && (',
    )
  })

  it('is never gated on playingSound alone', () => {
    expect(src).not.toMatch(/\{!audioState\.playingSound &&/)
  })
})
