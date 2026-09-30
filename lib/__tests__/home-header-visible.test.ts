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

// The same shape of bug, one flag over: closing the video player cleared
// playingSound but left fullPlayerOpen true, and the shell was overflow-hidden
// on that flag alone — Home stopped scrolling with no player on screen.
describe('home scroll after a player closes', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'components/home/ImmersiveHome.tsx'), 'utf8')

  it('closing the video player also clears the open flag', () => {
    const close = src.slice(src.indexOf('const handleClosePlayer'), src.indexOf('const handleClosePlayer') + 200)
    expect(close).toContain("dispatch({ type: 'CLOSE_PLAYER' })")
    expect(close).toContain('setFullPlayerOpen(false)')
  })

  it('the shell locks only while a player is on screen, never on the flag alone', () => {
    expect(src).toContain("${fullscreenOverlayShown ? 'overflow-hidden'")
    expect(src).toContain('(fullPlayerOpen && (!!audioState.playingSound || !!audioState.guideLabel))')
    expect(src).not.toMatch(/\$\{fullPlayerOpen \|\|/)
  })
})
