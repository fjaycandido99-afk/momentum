'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import type { YTPlayer } from '@/lib/youtube-types'
import type { AudioState } from './useAudioStateMachine'

interface PlayerRefs {
  bgPlayerRef: MutableRefObject<YTPlayer | null>
  bgPlayerReadyRef: MutableRefObject<boolean>
  soundscapePlayerRef: MutableRefObject<YTPlayer | null>
  soundscapeReadyRef: MutableRefObject<boolean>
  bgProgressIntervalRef: MutableRefObject<NodeJS.Timeout | null>
  keepaliveRef: MutableRefObject<HTMLAudioElement | null>
  wakeLockRef: MutableRefObject<any>
  currentBgVideoIdRef: MutableRefObject<string | null>
  currentScVideoIdRef: MutableRefObject<string | null>
}

interface UseAudioSideEffectsOptions {
  state: AudioState
  refs: PlayerRefs
  audioContext: any // AudioContextType | null
  dispatch: (action: any) => void
}

export function useAudioSideEffects({ state, refs, audioContext, dispatch }: UseAudioSideEffectsOptions) {
  const { bgPlayerRef, bgPlayerReadyRef, soundscapePlayerRef, soundscapeReadyRef, bgProgressIntervalRef, keepaliveRef, wakeLockRef, currentBgVideoIdRef, currentScVideoIdRef } = refs

  // Sync music play/pause to YT player
  useEffect(() => {
    if (!bgPlayerRef.current || !bgPlayerReadyRef.current || !state.backgroundMusic) return
    try {
      if (state.musicPlaying) {
        bgPlayerRef.current.playVideo()
      } else {
        bgPlayerRef.current.pauseVideo()
      }
    } catch (e) {
      console.error('[AudioSideEffects] Music play/pause error:', e)
    }
  }, [state.musicPlaying, state.backgroundMusic, bgPlayerRef, bgPlayerReadyRef])

  // Cleanup background music when cleared
  useEffect(() => {
    if (!state.backgroundMusic) {
      if (bgPlayerRef.current && bgPlayerReadyRef.current) {
        try { bgPlayerRef.current.stopVideo() } catch {}
      }
      if (bgProgressIntervalRef.current) {
        clearInterval(bgProgressIntervalRef.current)
        bgProgressIntervalRef.current = null
      }
      currentBgVideoIdRef.current = null
    }
  }, [state.backgroundMusic, bgPlayerRef, bgPlayerReadyRef, bgProgressIntervalRef, currentBgVideoIdRef])

  // Sync soundscape play/pause to YT player
  useEffect(() => {
    if (!soundscapeReadyRef.current || !soundscapePlayerRef.current) return
    try {
      if (state.soundscapeIsPlaying) {
        soundscapePlayerRef.current.playVideo()
      } else {
        soundscapePlayerRef.current.pauseVideo()
      }
    } catch (e) {
      console.error('[AudioSideEffects] Soundscape play/pause error:', e)
    }
  }, [state.soundscapeIsPlaying, soundscapePlayerRef, soundscapeReadyRef])

  // Cleanup soundscape when cleared
  useEffect(() => {
    if (!state.activeSoundscape) {
      if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
        try { soundscapePlayerRef.current.stopVideo() } catch {}
      }
      currentScVideoIdRef.current = null
    }
  }, [state.activeSoundscape, soundscapePlayerRef, soundscapeReadyRef, currentScVideoIdRef])

  // Manage keepalive/wake lock based on homeAudioActive
  useEffect(() => {
    if (state.homeAudioActive) {
      // Notify AudioContext
      if (audioContext) {
        audioContext.setSessionActive(true)
      }

      // Screen Wake Lock
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock
          lock.addEventListener('release', () => { wakeLockRef.current = null })
        }).catch(() => {})
      }

      // Web Locks API
      if ('locks' in navigator) {
        (navigator as any).locks.request('voxu-audio-playback', () =>
          new Promise<void>((resolve) => {
            const check = setInterval(() => {
              if (!state.homeAudioActive) {
                clearInterval(check)
                resolve()
              }
            }, 2000)
          })
        ).catch(() => {})
      }

      // Silent keepalive
      if (!keepaliveRef.current) {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==')
          audio.loop = true
          audio.volume = 0.01
          audio.play().catch(() => {})
          keepaliveRef.current = audio
        } catch {}
      }
    } else {
      // Notify AudioContext
      if (audioContext) {
        audioContext.setSessionActive(false)
      }

      // Stop keepalive
      if (keepaliveRef.current) {
        keepaliveRef.current.pause()
        keepaliveRef.current.src = ''
        keepaliveRef.current = null
      }
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release() } catch {}
        wakeLockRef.current = null
      }
    }
  }, [state.homeAudioActive, audioContext, keepaliveRef, wakeLockRef])

  // Clear media session on STOP_ALL
  useEffect(() => {
    if (!state.homeAudioActive && !state.backgroundMusic && !state.activeSoundscape && !state.guideLabel) {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none'
        navigator.mediaSession.metadata = null
      }
    }
  }, [state.homeAudioActive, state.backgroundMusic, state.activeSoundscape, state.guideLabel])
}
