'use client'

import { useEffect, type MutableRefObject } from 'react'
import type { YTPlayer } from '@/lib/youtube-types'
import type { AudioState } from './useAudioStateMachine'

interface UseVisibilityResumeOptions {
  state: AudioState
  bgPlayerRef: MutableRefObject<YTPlayer | null>
  bgPlayerReadyRef: MutableRefObject<boolean>
  soundscapePlayerRef: MutableRefObject<YTPlayer | null>
  soundscapeReadyRef: MutableRefObject<boolean>
  currentBgVideoIdRef: MutableRefObject<string | null>
  currentScVideoIdRef: MutableRefObject<string | null>
  guideAudioRef: MutableRefObject<HTMLAudioElement | null>
  wakeLockRef: MutableRefObject<any>
}

export function useVisibilityResume({
  state, bgPlayerRef, bgPlayerReadyRef, soundscapePlayerRef, soundscapeReadyRef,
  currentBgVideoIdRef, currentScVideoIdRef, guideAudioRef, wakeLockRef,
}: UseVisibilityResumeOptions) {
  useEffect(() => {
    let reloadAttempted = false

    const tryResume = () => {
      // Resume background music - only if user didn't manually pause
      if (currentBgVideoIdRef.current && bgPlayerRef.current && bgPlayerReadyRef.current && !state.userPausedMusic) {
        try {
          const playerState = bgPlayerRef.current.getPlayerState()
          if (playerState !== 1) {
            if (!reloadAttempted) {
              bgPlayerRef.current.playVideo()
            } else {
              bgPlayerRef.current.loadVideoById(currentBgVideoIdRef.current)
              bgPlayerRef.current.setVolume(80)
            }
          }
        } catch {}
      }

      // Resume soundscape - only if user didn't manually pause
      if (currentScVideoIdRef.current && soundscapePlayerRef.current && soundscapeReadyRef.current && !state.userPausedSoundscape) {
        try {
          const playerState = soundscapePlayerRef.current.getPlayerState()
          if (playerState !== 1) {
            if (!reloadAttempted) {
              soundscapePlayerRef.current.playVideo()
            } else {
              soundscapePlayerRef.current.loadVideoById(currentScVideoIdRef.current)
              soundscapePlayerRef.current.setVolume(100)
            }
          }
        } catch {}
      }

      // Resume guide audio - only if user didn't manually pause
      if (state.guideLabel && guideAudioRef.current?.paused && !state.userPausedGuide) {
        guideAudioRef.current.play().catch(() => {})
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (!state.homeAudioActive) return

      // Re-acquire wake lock
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock
        }).catch(() => {})
      }

      // First attempt: playVideo
      reloadAttempted = false
      tryResume()

      // Second attempt after 800ms: reload if still not playing
      setTimeout(() => {
        reloadAttempted = true
        tryResume()
      }, 800)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [state.guideLabel, state.homeAudioActive, state.userPausedMusic, state.userPausedSoundscape, state.userPausedGuide,
      bgPlayerRef, bgPlayerReadyRef, soundscapePlayerRef, soundscapeReadyRef,
      currentBgVideoIdRef, currentScVideoIdRef, guideAudioRef, wakeLockRef])
}
