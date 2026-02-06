'use client'

import { useEffect, type MutableRefObject, type Dispatch } from 'react'
import type { AudioState, AudioAction } from './useAudioStateMachine'

interface UseMediaSessionOptions {
  state: AudioState
  dispatch: Dispatch<AudioAction>
  guideAudioRef: MutableRefObject<HTMLAudioElement | null>
  onStopAll: () => void
}

export function useMediaSession({ state, dispatch, guideAudioRef, onStopAll }: UseMediaSessionOptions) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const label = state.backgroundMusic?.label || state.guideLabel || state.activeSoundscape?.label
    const playing = state.musicPlaying || state.guideIsPlaying || state.soundscapeIsPlaying

    if (!label) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
      return
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: label,
      artist: 'Voxu',
      album: state.backgroundMusic ? 'Music' : state.guideLabel ? 'Guided' : 'Soundscape',
    })
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'

    navigator.mediaSession.setActionHandler('play', () => {
      if (state.backgroundMusic) {
        dispatch({ type: 'RESUME_MUSIC' })
      } else if (state.activeSoundscape) {
        dispatch({ type: 'RESUME_SOUNDSCAPE' })
      } else if (guideAudioRef.current) {
        guideAudioRef.current.play().then(() => dispatch({ type: 'RESUME_GUIDE' }))
      }
    })

    navigator.mediaSession.setActionHandler('pause', () => {
      if (state.backgroundMusic) {
        dispatch({ type: 'PAUSE_MUSIC' })
      } else if (state.activeSoundscape) {
        dispatch({ type: 'PAUSE_SOUNDSCAPE' })
      } else if (guideAudioRef.current) {
        guideAudioRef.current.pause()
        dispatch({ type: 'PAUSE_GUIDE' })
      }
    })

    navigator.mediaSession.setActionHandler('stop', () => {
      onStopAll()
    })
  }, [state.backgroundMusic, state.guideLabel, state.activeSoundscape,
      state.musicPlaying, state.guideIsPlaying, state.soundscapeIsPlaying,
      dispatch, guideAudioRef, onStopAll])
}
