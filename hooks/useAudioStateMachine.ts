import { useReducer } from 'react'
import type { VideoItem } from '@/components/home/home-types'

// --- State shape ---

export interface AudioState {
  // Background music
  backgroundMusic: { youtubeId: string; label: string } | null
  musicPlaying: boolean
  userPausedMusic: boolean
  musicDuration: number
  musicCurrentTime: number

  // Soundscape
  activeSoundscape: { soundId: string; label: string; subtitle: string; youtubeId: string } | null
  soundscapeIsPlaying: boolean
  userPausedSoundscape: boolean
  showSoundscapePlayer: boolean

  // Guided voice
  guideLabel: string | null
  guideIsPlaying: boolean
  userPausedGuide: boolean
  loadingGuide: string | null

  // Playlist / cards
  currentPlaylist: {
    videos: VideoItem[]
    index: number
    type: 'motivation' | 'music'
    genreId?: string
    genreWord?: string
  } | null
  activeCardId: string | null
  tappedCardId: string | null

  // Visual player overlay
  playingSound: {
    word: string
    color: string
    youtubeId: string
    backgroundImage?: string
  } | null

  // Global flags
  homeAudioActive: boolean
}

export const initialAudioState: AudioState = {
  backgroundMusic: null,
  musicPlaying: false,
  userPausedMusic: false,
  musicDuration: 0,
  musicCurrentTime: 0,
  activeSoundscape: null,
  soundscapeIsPlaying: false,
  userPausedSoundscape: false,
  showSoundscapePlayer: false,
  guideLabel: null,
  guideIsPlaying: false,
  userPausedGuide: false,
  loadingGuide: null,
  currentPlaylist: null,
  activeCardId: null,
  tappedCardId: null,
  playingSound: null,
  homeAudioActive: false,
}

// --- Actions ---

export type AudioAction =
  | { type: 'PLAY_MUSIC'; youtubeId: string; label: string; cardId: string; playlist: AudioState['currentPlaylist']; playingSound: AudioState['playingSound'] }
  | { type: 'PAUSE_MUSIC' }
  | { type: 'RESUME_MUSIC' }
  | { type: 'STOP_MUSIC' }
  | { type: 'PLAY_SOUNDSCAPE'; soundscape: NonNullable<AudioState['activeSoundscape']> }
  | { type: 'PAUSE_SOUNDSCAPE' }
  | { type: 'RESUME_SOUNDSCAPE' }
  | { type: 'SHOW_SOUNDSCAPE_PLAYER' }
  | { type: 'HIDE_SOUNDSCAPE_PLAYER' }
  | { type: 'SWITCH_SOUNDSCAPE'; soundscape: NonNullable<AudioState['activeSoundscape']> }
  | { type: 'PLAY_GUIDE'; guideId: string; guideName: string }
  | { type: 'GUIDE_LOADED' }
  | { type: 'GUIDE_PLAY_STARTED' }
  | { type: 'PAUSE_GUIDE' }
  | { type: 'RESUME_GUIDE' }
  | { type: 'GUIDE_ENDED' }
  | { type: 'GUIDE_ERROR' }
  | { type: 'SKIP_NEXT'; nextVideo: VideoItem; nextIndex: number; backgroundImage?: string; label: string }
  | { type: 'SKIP_PREVIOUS'; prevVideo: VideoItem; prevIndex: number; backgroundImage?: string; label: string }
  | { type: 'RESTORE_LAST_PLAYED'; partial: Partial<AudioState> }
  | { type: 'STOP_ALL' }
  | { type: 'CLOSE_PLAYER' }
  | { type: 'MUSIC_TIME_UPDATE'; currentTime: number; duration: number }
  | { type: 'MUSIC_YT_PLAYING' }
  | { type: 'MUSIC_YT_PAUSED' }
  | { type: 'MUSIC_YT_ENDED' }
  | { type: 'SOUNDSCAPE_YT_PLAYING' }
  | { type: 'SOUNDSCAPE_YT_PAUSED' }
  | { type: 'TAP_CARD'; videoId: string }
  | { type: 'CLEAR_TAP' }
  | { type: 'SET_LOADING_GUIDE'; guideId: string | null }
  | { type: 'OPEN_FULLSCREEN_PLAYER'; playingSound: AudioState['playingSound'] }

// --- Reducer (pure — no side effects) ---

export function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'PLAY_MUSIC':
      // Exclusive: stop guide and soundscape
      return {
        ...state,
        backgroundMusic: { youtubeId: action.youtubeId, label: action.label },
        musicPlaying: true,
        userPausedMusic: false,
        musicDuration: 0,
        musicCurrentTime: 0,
        activeCardId: action.cardId,
        currentPlaylist: action.playlist,
        playingSound: action.playingSound,
        homeAudioActive: true,
        // Stop guide
        guideLabel: null,
        guideIsPlaying: false,
        loadingGuide: null,
        // Stop soundscape
        activeSoundscape: null,
        soundscapeIsPlaying: false,
        userPausedSoundscape: false,
        showSoundscapePlayer: false,
      }

    case 'PAUSE_MUSIC':
      return { ...state, musicPlaying: false, userPausedMusic: true }

    case 'RESUME_MUSIC':
      return { ...state, musicPlaying: true, userPausedMusic: false }

    case 'STOP_MUSIC':
      return {
        ...state,
        backgroundMusic: null,
        musicPlaying: false,
        userPausedMusic: false,
        musicDuration: 0,
        musicCurrentTime: 0,
        activeCardId: null,
        currentPlaylist: null,
        playingSound: null,
        // Stay active if soundscape is still playing
        homeAudioActive: !!(state.activeSoundscape && state.soundscapeIsPlaying),
      }

    case 'PLAY_SOUNDSCAPE':
      // Exclusive: stop guide and music
      return {
        ...state,
        activeSoundscape: action.soundscape,
        soundscapeIsPlaying: true,
        userPausedSoundscape: false,
        showSoundscapePlayer: true,
        homeAudioActive: true,
        // Stop guide
        guideLabel: null,
        guideIsPlaying: false,
        loadingGuide: null,
        // Stop music
        backgroundMusic: null,
        musicPlaying: false,
        userPausedMusic: false,
        musicDuration: 0,
        musicCurrentTime: 0,
        activeCardId: null,
        currentPlaylist: null,
        playingSound: null,
      }

    case 'PAUSE_SOUNDSCAPE':
      return { ...state, soundscapeIsPlaying: false, userPausedSoundscape: true }

    case 'RESUME_SOUNDSCAPE':
      return { ...state, soundscapeIsPlaying: true, userPausedSoundscape: false }

    case 'SHOW_SOUNDSCAPE_PLAYER':
      return { ...state, showSoundscapePlayer: true }

    case 'HIDE_SOUNDSCAPE_PLAYER':
      return { ...state, showSoundscapePlayer: false }

    case 'SWITCH_SOUNDSCAPE':
      return {
        ...state,
        activeSoundscape: action.soundscape,
        soundscapeIsPlaying: true,
        userPausedSoundscape: false,
      }

    case 'PLAY_GUIDE':
      // Exclusive: stop both music and soundscape
      return {
        ...state,
        guideLabel: action.guideName,
        guideIsPlaying: false,
        userPausedGuide: false,
        loadingGuide: action.guideId,
        homeAudioActive: true,
        // Stop soundscape
        activeSoundscape: null,
        showSoundscapePlayer: false,
        soundscapeIsPlaying: false,
        userPausedSoundscape: false,
        // Stop music
        backgroundMusic: null,
        musicPlaying: false,
        userPausedMusic: false,
        musicDuration: 0,
        musicCurrentTime: 0,
        activeCardId: null,
        currentPlaylist: null,
        playingSound: null,
      }

    case 'GUIDE_LOADED':
      return { ...state, loadingGuide: null }

    case 'GUIDE_PLAY_STARTED':
      return { ...state, guideIsPlaying: true, loadingGuide: null }

    case 'PAUSE_GUIDE':
      return { ...state, guideIsPlaying: false, userPausedGuide: true }

    case 'RESUME_GUIDE':
      return { ...state, guideIsPlaying: true, userPausedGuide: false }

    case 'GUIDE_ENDED':
      return { ...state, guideIsPlaying: false, guideLabel: null, userPausedGuide: false, homeAudioActive: false }

    case 'GUIDE_ERROR':
      return { ...state, guideIsPlaying: false, guideLabel: null, userPausedGuide: false, loadingGuide: null, homeAudioActive: false }

    case 'SKIP_NEXT':
    case 'SKIP_PREVIOUS': {
      const isNext = action.type === 'SKIP_NEXT'
      const video = isNext ? (action as Extract<AudioAction, { type: 'SKIP_NEXT' }>).nextVideo : (action as Extract<AudioAction, { type: 'SKIP_PREVIOUS' }>).prevVideo
      const idx = isNext ? (action as Extract<AudioAction, { type: 'SKIP_NEXT' }>).nextIndex : (action as Extract<AudioAction, { type: 'SKIP_PREVIOUS' }>).prevIndex
      return {
        ...state,
        activeCardId: video.id,
        currentPlaylist: state.currentPlaylist ? { ...state.currentPlaylist, index: idx } : null,
        backgroundMusic: { youtubeId: video.youtubeId, label: action.label },
        musicPlaying: true,
        userPausedMusic: false,
        musicDuration: 0,
        musicCurrentTime: 0,
        playingSound: state.playingSound ? {
          ...state.playingSound,
          youtubeId: video.youtubeId,
          backgroundImage: action.backgroundImage,
        } : null,
      }
    }

    case 'RESTORE_LAST_PLAYED':
      return { ...state, ...action.partial }

    case 'STOP_ALL':
      return {
        ...initialAudioState,
      }

    case 'CLOSE_PLAYER':
      return { ...state, playingSound: null }

    case 'MUSIC_TIME_UPDATE':
      return {
        ...state,
        musicCurrentTime: action.currentTime,
        musicDuration: action.duration > 0 ? action.duration : state.musicDuration,
      }

    case 'MUSIC_YT_PLAYING':
      return { ...state, musicPlaying: true }

    case 'MUSIC_YT_PAUSED':
      return { ...state, musicPlaying: false }

    case 'MUSIC_YT_ENDED':
      // Handled by autoSkipNext or loop in the side-effect hook
      return state

    case 'SOUNDSCAPE_YT_PLAYING':
      return { ...state, soundscapeIsPlaying: true }

    case 'SOUNDSCAPE_YT_PAUSED':
      return { ...state, soundscapeIsPlaying: false }

    case 'TAP_CARD':
      return { ...state, tappedCardId: action.videoId }

    case 'CLEAR_TAP':
      return { ...state, tappedCardId: null }

    case 'SET_LOADING_GUIDE':
      return { ...state, loadingGuide: action.guideId }

    case 'OPEN_FULLSCREEN_PLAYER':
      return { ...state, playingSound: action.playingSound }

    default:
      return state
  }
}

export function useAudioStateMachine() {
  return useReducer(audioReducer, initialAudioState)
}
