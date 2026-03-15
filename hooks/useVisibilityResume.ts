'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import type { YTPlayer } from '@/lib/youtube-types'
import type { AudioState } from './useAudioStateMachine'
import { isNativePlatform } from '@/lib/guide-audio-native'

interface UseVisibilityResumeOptions {
  state: AudioState
  bgPlayerRef: MutableRefObject<YTPlayer | null>
  bgPlayerReadyRef: MutableRefObject<boolean>
  soundscapePlayerRef: MutableRefObject<YTPlayer | null>
  soundscapeReadyRef: MutableRefObject<boolean>
  currentBgVideoIdRef: MutableRefObject<string | null>
  currentScVideoIdRef: MutableRefObject<string | null>
  guideAudioRef: MutableRefObject<HTMLAudioElement | null>
  guideNativeLoadedRef: MutableRefObject<boolean>
  wakeLockRef: MutableRefObject<any>
}

export function useVisibilityResume({
  state, bgPlayerRef, bgPlayerReadyRef, soundscapePlayerRef, soundscapeReadyRef,
  currentBgVideoIdRef, currentScVideoIdRef, guideAudioRef, guideNativeLoadedRef, wakeLockRef,
}: UseVisibilityResumeOptions) {
  // Use refs to avoid stale closures — state values change frequently
  // but the visibility handler should always read the latest values
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    let reloadAttempted = false
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null

    const tryResume = () => {
      const s = stateRef.current

      // Resume background music - only if user didn't manually pause
      if (currentBgVideoIdRef.current && bgPlayerRef.current && bgPlayerReadyRef.current && !s.userPausedMusic) {
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
      if (currentScVideoIdRef.current && soundscapePlayerRef.current && soundscapeReadyRef.current && !s.userPausedSoundscape) {
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
      if (s.guideLabel && !s.userPausedGuide) {
        if (guideAudioRef.current?.paused) {
          guideAudioRef.current.play().catch(() => {})
        }
      }
    }

    const handleResume = () => {
      if (!stateRef.current.homeAudioActive) return

      // Re-acquire wake lock
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLockRef.current = lock
        }).catch(() => {})
      }

      // Clear any pending retry from a previous event
      if (resumeTimeout) clearTimeout(resumeTimeout)

      // First attempt: playVideo
      reloadAttempted = false
      tryResume()

      // Second attempt after 800ms: reload if still not playing
      resumeTimeout = setTimeout(() => {
        reloadAttempted = true
        tryResume()
      }, 800)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      handleResume()
    }

    // Web: use visibilitychange
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Native iOS: also use Capacitor App events (more reliable than visibilitychange in WKWebView)
    let removeAppResumeListener: (() => void) | null = null
    if (isNativePlatform) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('resume', handleResume).then(handle => {
          removeAppResumeListener = () => handle.remove()
        })
      }).catch(() => {})
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (resumeTimeout) clearTimeout(resumeTimeout)
      if (removeAppResumeListener) removeAppResumeListener()
    }
  }, [bgPlayerRef, bgPlayerReadyRef, soundscapePlayerRef, soundscapeReadyRef,
      currentBgVideoIdRef, currentScVideoIdRef, guideAudioRef, guideNativeLoadedRef, wakeLockRef])
}
