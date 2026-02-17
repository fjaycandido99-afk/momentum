import { describe, it, expect } from 'vitest'
import { audioReducer, initialAudioState, AudioState, AudioAction } from '../useAudioStateMachine'

function reduce(action: AudioAction, state: AudioState = initialAudioState): AudioState {
  return audioReducer(state, action)
}

describe('audioReducer', () => {
  // --- Initial state ---
  it('should have correct initial state', () => {
    expect(initialAudioState.backgroundMusic).toBeNull()
    expect(initialAudioState.musicPlaying).toBe(false)
    expect(initialAudioState.activeSoundscape).toBeNull()
    expect(initialAudioState.guideLabel).toBeNull()
    expect(initialAudioState.homeAudioActive).toBe(false)
  })

  // --- PLAY_MUSIC ---
  describe('PLAY_MUSIC', () => {
    it('should set background music and mark as playing', () => {
      const state = reduce({
        type: 'PLAY_MUSIC',
        youtubeId: 'abc123',
        label: 'Lo-fi Beats',
        cardId: 'card-1',
        playlist: { videos: [], index: 0, type: 'music', genreId: 'lofi' },
        playingSound: { word: 'Lo-fi', color: '#fff', youtubeId: 'abc123' },
      })
      expect(state.backgroundMusic).toEqual({ youtubeId: 'abc123', label: 'Lo-fi Beats' })
      expect(state.musicPlaying).toBe(true)
      expect(state.userPausedMusic).toBe(false)
      expect(state.homeAudioActive).toBe(true)
      expect(state.activeCardId).toBe('card-1')
    })

    it('should stop soundscape when music starts', () => {
      const withSoundscape: AudioState = {
        ...initialAudioState,
        activeSoundscape: { soundId: 's1', label: 'Rain', subtitle: '', youtubeId: 'rain1' },
        soundscapeIsPlaying: true,
      }
      const state = audioReducer(withSoundscape, {
        type: 'PLAY_MUSIC',
        youtubeId: 'abc123',
        label: 'Test',
        cardId: 'c1',
        playlist: null,
        playingSound: null,
      })
      expect(state.activeSoundscape).toBeNull()
      expect(state.soundscapeIsPlaying).toBe(false)
    })

    it('should stop guide when music starts', () => {
      const withGuide: AudioState = {
        ...initialAudioState,
        guideLabel: 'Breathing',
        guideIsPlaying: true,
      }
      const state = audioReducer(withGuide, {
        type: 'PLAY_MUSIC',
        youtubeId: 'abc123',
        label: 'Test',
        cardId: 'c1',
        playlist: null,
        playingSound: null,
      })
      expect(state.guideLabel).toBeNull()
      expect(state.guideIsPlaying).toBe(false)
    })
  })

  // --- PAUSE_MUSIC / RESUME_MUSIC ---
  describe('PAUSE_MUSIC', () => {
    it('should pause music and set user paused flag', () => {
      const playing = { ...initialAudioState, musicPlaying: true }
      const state = audioReducer(playing, { type: 'PAUSE_MUSIC' })
      expect(state.musicPlaying).toBe(false)
      expect(state.userPausedMusic).toBe(true)
    })
  })

  describe('RESUME_MUSIC', () => {
    it('should resume music and clear user paused flag', () => {
      const paused = { ...initialAudioState, musicPlaying: false, userPausedMusic: true }
      const state = audioReducer(paused, { type: 'RESUME_MUSIC' })
      expect(state.musicPlaying).toBe(true)
      expect(state.userPausedMusic).toBe(false)
    })
  })

  // --- STOP_MUSIC ---
  describe('STOP_MUSIC', () => {
    it('should clear all music state', () => {
      const playing: AudioState = {
        ...initialAudioState,
        backgroundMusic: { youtubeId: 'x', label: 'X' },
        musicPlaying: true,
        activeCardId: 'c1',
        currentPlaylist: { videos: [], index: 0, type: 'music' },
        playingSound: { word: 'X', color: '#fff', youtubeId: 'x' },
        homeAudioActive: true,
      }
      const state = audioReducer(playing, { type: 'STOP_MUSIC' })
      expect(state.backgroundMusic).toBeNull()
      expect(state.musicPlaying).toBe(false)
      expect(state.activeCardId).toBeNull()
      expect(state.currentPlaylist).toBeNull()
      expect(state.playingSound).toBeNull()
      expect(state.homeAudioActive).toBe(false)
    })
  })

  // --- PLAY_SOUNDSCAPE ---
  describe('PLAY_SOUNDSCAPE', () => {
    it('should set soundscape and stop music/guide', () => {
      const withMusic: AudioState = {
        ...initialAudioState,
        backgroundMusic: { youtubeId: 'x', label: 'X' },
        musicPlaying: true,
      }
      const soundscape = { soundId: 'rain', label: 'Rain', subtitle: 'Nature', youtubeId: 'rain1' }
      const state = audioReducer(withMusic, { type: 'PLAY_SOUNDSCAPE', soundscape })
      expect(state.activeSoundscape).toEqual(soundscape)
      expect(state.soundscapeIsPlaying).toBe(true)
      expect(state.backgroundMusic).toBeNull()
      expect(state.musicPlaying).toBe(false)
      expect(state.homeAudioActive).toBe(true)
    })
  })

  // --- PAUSE/RESUME SOUNDSCAPE ---
  describe('PAUSE_SOUNDSCAPE', () => {
    it('should pause soundscape', () => {
      const playing = { ...initialAudioState, soundscapeIsPlaying: true }
      const state = audioReducer(playing, { type: 'PAUSE_SOUNDSCAPE' })
      expect(state.soundscapeIsPlaying).toBe(false)
      expect(state.userPausedSoundscape).toBe(true)
    })
  })

  describe('RESUME_SOUNDSCAPE', () => {
    it('should resume soundscape', () => {
      const paused = { ...initialAudioState, soundscapeIsPlaying: false, userPausedSoundscape: true }
      const state = audioReducer(paused, { type: 'RESUME_SOUNDSCAPE' })
      expect(state.soundscapeIsPlaying).toBe(true)
      expect(state.userPausedSoundscape).toBe(false)
    })
  })

  // --- SHOW/HIDE SOUNDSCAPE_PLAYER ---
  it('SHOW_SOUNDSCAPE_PLAYER sets flag', () => {
    expect(reduce({ type: 'SHOW_SOUNDSCAPE_PLAYER' }).showSoundscapePlayer).toBe(true)
  })
  it('HIDE_SOUNDSCAPE_PLAYER clears flag', () => {
    const state = audioReducer({ ...initialAudioState, showSoundscapePlayer: true }, { type: 'HIDE_SOUNDSCAPE_PLAYER' })
    expect(state.showSoundscapePlayer).toBe(false)
  })

  // --- SWITCH_SOUNDSCAPE ---
  it('SWITCH_SOUNDSCAPE updates soundscape and resumes', () => {
    const newSS = { soundId: 'ocean', label: 'Ocean', subtitle: 'Water', youtubeId: 'ocean1' }
    const state = reduce({ type: 'SWITCH_SOUNDSCAPE', soundscape: newSS })
    expect(state.activeSoundscape).toEqual(newSS)
    expect(state.soundscapeIsPlaying).toBe(true)
    expect(state.userPausedSoundscape).toBe(false)
  })

  // --- PLAY_GUIDE ---
  describe('PLAY_GUIDE', () => {
    it('should set guide loading and stop soundscape', () => {
      const withSS: AudioState = {
        ...initialAudioState,
        activeSoundscape: { soundId: 's1', label: 'Rain', subtitle: '', youtubeId: 'r1' },
        soundscapeIsPlaying: true,
      }
      const state = audioReducer(withSS, { type: 'PLAY_GUIDE', guideId: 'breathing', guideName: 'Breathing' })
      expect(state.guideLabel).toBe('Breathing')
      expect(state.loadingGuide).toBe('breathing')
      expect(state.guideIsPlaying).toBe(false)
      expect(state.activeSoundscape).toBeNull()
      expect(state.soundscapeIsPlaying).toBe(false)
    })
  })

  // --- GUIDE lifecycle ---
  it('GUIDE_LOADED clears loading', () => {
    const loading = { ...initialAudioState, loadingGuide: 'breathing' }
    expect(audioReducer(loading, { type: 'GUIDE_LOADED' }).loadingGuide).toBeNull()
  })

  it('GUIDE_PLAY_STARTED sets playing', () => {
    const state = reduce({ type: 'GUIDE_PLAY_STARTED' })
    expect(state.guideIsPlaying).toBe(true)
    expect(state.loadingGuide).toBeNull()
  })

  it('PAUSE_GUIDE pauses', () => {
    const playing = { ...initialAudioState, guideIsPlaying: true }
    const state = audioReducer(playing, { type: 'PAUSE_GUIDE' })
    expect(state.guideIsPlaying).toBe(false)
    expect(state.userPausedGuide).toBe(true)
  })

  it('RESUME_GUIDE resumes', () => {
    const paused = { ...initialAudioState, guideIsPlaying: false, userPausedGuide: true }
    const state = audioReducer(paused, { type: 'RESUME_GUIDE' })
    expect(state.guideIsPlaying).toBe(true)
    expect(state.userPausedGuide).toBe(false)
  })

  it('GUIDE_ENDED clears guide state', () => {
    const playing = { ...initialAudioState, guideIsPlaying: true, guideLabel: 'Test', homeAudioActive: true }
    const state = audioReducer(playing, { type: 'GUIDE_ENDED' })
    expect(state.guideIsPlaying).toBe(false)
    expect(state.guideLabel).toBeNull()
    expect(state.homeAudioActive).toBe(false)
  })

  it('GUIDE_ERROR clears guide state and loading', () => {
    const loading = { ...initialAudioState, loadingGuide: 'test', guideLabel: 'Test' }
    const state = audioReducer(loading, { type: 'GUIDE_ERROR' })
    expect(state.loadingGuide).toBeNull()
    expect(state.guideLabel).toBeNull()
    expect(state.guideIsPlaying).toBe(false)
  })

  // --- SKIP_NEXT / SKIP_PREVIOUS ---
  describe('SKIP_NEXT', () => {
    it('should advance to next video', () => {
      const video = { id: 'v2', youtubeId: 'yt2', title: 'Next', channel: 'Ch' }
      const withPlaylist: AudioState = {
        ...initialAudioState,
        currentPlaylist: { videos: [{ id: 'v1', youtubeId: 'yt1', title: 'First', channel: 'Ch' }, video], index: 0, type: 'music' },
        playingSound: { word: 'Music', color: '#fff', youtubeId: 'yt1' },
      }
      const state = audioReducer(withPlaylist, {
        type: 'SKIP_NEXT',
        nextVideo: video,
        nextIndex: 1,
        label: 'Next',
      })
      expect(state.activeCardId).toBe('v2')
      expect(state.backgroundMusic?.youtubeId).toBe('yt2')
      expect(state.currentPlaylist?.index).toBe(1)
      expect(state.musicPlaying).toBe(true)
    })
  })

  // --- RESTORE_LAST_PLAYED ---
  it('RESTORE_LAST_PLAYED merges partial state', () => {
    const state = reduce({
      type: 'RESTORE_LAST_PLAYED',
      partial: { backgroundMusic: { youtubeId: 'restored', label: 'Restored' }, homeAudioActive: true },
    })
    expect(state.backgroundMusic?.youtubeId).toBe('restored')
    expect(state.homeAudioActive).toBe(true)
  })

  // --- STOP_ALL ---
  it('STOP_ALL resets to initial state', () => {
    const complex: AudioState = {
      ...initialAudioState,
      backgroundMusic: { youtubeId: 'x', label: 'X' },
      musicPlaying: true,
      activeSoundscape: { soundId: 's1', label: 'S', subtitle: '', youtubeId: 'y' },
      guideLabel: 'Guide',
      homeAudioActive: true,
    }
    const state = audioReducer(complex, { type: 'STOP_ALL' })
    expect(state).toEqual(initialAudioState)
  })

  // --- CLOSE_PLAYER ---
  it('CLOSE_PLAYER clears playingSound only', () => {
    const withPlayer: AudioState = {
      ...initialAudioState,
      playingSound: { word: 'X', color: '#fff', youtubeId: 'x' },
      musicPlaying: true,
    }
    const state = audioReducer(withPlayer, { type: 'CLOSE_PLAYER' })
    expect(state.playingSound).toBeNull()
    expect(state.musicPlaying).toBe(true) // Music keeps playing
  })

  // --- MUSIC_TIME_UPDATE ---
  it('MUSIC_TIME_UPDATE updates time and duration', () => {
    const state = reduce({ type: 'MUSIC_TIME_UPDATE', currentTime: 30, duration: 180 })
    expect(state.musicCurrentTime).toBe(30)
    expect(state.musicDuration).toBe(180)
  })

  it('MUSIC_TIME_UPDATE keeps existing duration if new is 0', () => {
    const withDuration = { ...initialAudioState, musicDuration: 180 }
    const state = audioReducer(withDuration, { type: 'MUSIC_TIME_UPDATE', currentTime: 5, duration: 0 })
    expect(state.musicDuration).toBe(180)
  })

  // --- YT event actions ---
  it('MUSIC_YT_PLAYING sets musicPlaying true', () => {
    expect(reduce({ type: 'MUSIC_YT_PLAYING' }).musicPlaying).toBe(true)
  })

  it('MUSIC_YT_PAUSED sets musicPlaying false', () => {
    const playing = { ...initialAudioState, musicPlaying: true }
    expect(audioReducer(playing, { type: 'MUSIC_YT_PAUSED' }).musicPlaying).toBe(false)
  })

  it('MUSIC_YT_ENDED returns same state (handled by side effects)', () => {
    const state = { ...initialAudioState, musicPlaying: true }
    expect(audioReducer(state, { type: 'MUSIC_YT_ENDED' })).toBe(state)
  })

  it('SOUNDSCAPE_YT_PLAYING sets soundscapeIsPlaying true', () => {
    expect(reduce({ type: 'SOUNDSCAPE_YT_PLAYING' }).soundscapeIsPlaying).toBe(true)
  })

  it('SOUNDSCAPE_YT_PAUSED sets soundscapeIsPlaying false', () => {
    const playing = { ...initialAudioState, soundscapeIsPlaying: true }
    expect(audioReducer(playing, { type: 'SOUNDSCAPE_YT_PAUSED' }).soundscapeIsPlaying).toBe(false)
  })

  // --- TAP_CARD / CLEAR_TAP ---
  it('TAP_CARD sets tappedCardId', () => {
    expect(reduce({ type: 'TAP_CARD', videoId: 'v1' }).tappedCardId).toBe('v1')
  })

  it('CLEAR_TAP clears tappedCardId', () => {
    const tapped = { ...initialAudioState, tappedCardId: 'v1' }
    expect(audioReducer(tapped, { type: 'CLEAR_TAP' }).tappedCardId).toBeNull()
  })

  // --- SET_LOADING_GUIDE ---
  it('SET_LOADING_GUIDE sets loading guide id', () => {
    expect(reduce({ type: 'SET_LOADING_GUIDE', guideId: 'test' }).loadingGuide).toBe('test')
  })

  it('SET_LOADING_GUIDE can clear loading', () => {
    const loading = { ...initialAudioState, loadingGuide: 'test' }
    expect(audioReducer(loading, { type: 'SET_LOADING_GUIDE', guideId: null }).loadingGuide).toBeNull()
  })

  // --- OPEN_FULLSCREEN_PLAYER ---
  it('OPEN_FULLSCREEN_PLAYER sets playingSound', () => {
    const ps = { word: 'Jazz', color: '#000', youtubeId: 'jazz1' }
    expect(reduce({ type: 'OPEN_FULLSCREEN_PLAYER', playingSound: ps }).playingSound).toEqual(ps)
  })

  // --- Default case ---
  it('returns same state for unknown action', () => {
    const state = { ...initialAudioState }
    // @ts-expect-error Testing unknown action
    expect(audioReducer(state, { type: 'UNKNOWN_ACTION' })).toBe(state)
  })
})
