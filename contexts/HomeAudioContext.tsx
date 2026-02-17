'use client'

import React, { createContext, useContext, useRef, useEffect, useState, useCallback, useMemo, type ReactNode, type MutableRefObject, type Dispatch } from 'react'
import { usePathname } from 'next/navigation'
import type { YTPlayer } from '@/lib/youtube-types'
import '@/lib/youtube-types'
import { useAudioStateMachine, type AudioState, type AudioAction } from '@/hooks/useAudioStateMachine'
import { useAudioSideEffects } from '@/hooks/useAudioSideEffects'
import { useVisibilityResume } from '@/hooks/useVisibilityResume'
import { useMediaSession } from '@/hooks/useMediaSession'
import { useAudioOptional } from '@/contexts/AudioContext'

// --- Context shape ---

export interface HomeAudioRefs {
  bgPlayerRef: MutableRefObject<YTPlayer | null>
  bgPlayerReadyRef: MutableRefObject<boolean>
  soundscapePlayerRef: MutableRefObject<YTPlayer | null>
  soundscapeReadyRef: MutableRefObject<boolean>
  bgProgressIntervalRef: MutableRefObject<NodeJS.Timeout | null>
  currentBgVideoIdRef: MutableRefObject<string | null>
  currentScVideoIdRef: MutableRefObject<string | null>
  keepaliveRef: MutableRefObject<HTMLAudioElement | null>
  wakeLockRef: MutableRefObject<any>
  guideAudioRef: MutableRefObject<HTMLAudioElement | null>
  autoSkipNextRef: MutableRefObject<(() => void) | null>
}

interface HomeAudioContextType {
  audioState: AudioState
  dispatch: Dispatch<AudioAction>
  refs: HomeAudioRefs
  createBgMusicPlayer: (youtubeId: string) => void
  createSoundscapePlayer: (youtubeId: string) => void
  stopBackgroundMusic: () => void
  stopAllHomeAudio: () => void
}

const HomeAudioContext = createContext<HomeAudioContextType | null>(null)

export function useHomeAudio() {
  const ctx = useContext(HomeAudioContext)
  if (!ctx) throw new Error('useHomeAudio must be used within HomeAudioProvider')
  return ctx
}

export function useHomeAudioOptional() {
  return useContext(HomeAudioContext)
}

// --- Provider ---

interface HomeAudioProviderProps {
  children: ReactNode
}

export function HomeAudioProvider({ children }: HomeAudioProviderProps) {
  const pathname = usePathname()
  const audioContext = useAudioOptional()

  // Audio state machine (lifted from ImmersiveHome)
  const [audioState, dispatch] = useAudioStateMachine()

  // Player refs (lifted from ImmersiveHome)
  const soundscapePlayerRef = useRef<YTPlayer | null>(null)
  const soundscapeContainerRef = useRef<HTMLDivElement>(null)
  const soundscapeReadyRef = useRef(false)
  const bgPlayerRef = useRef<YTPlayer | null>(null)
  const bgPlayerContainerRef = useRef<HTMLDivElement>(null)
  const bgProgressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const bgPlayerReadyRef = useRef(false)
  const keepaliveRef = useRef<HTMLAudioElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null)
  const currentBgVideoIdRef = useRef<string | null>(null)
  const currentScVideoIdRef = useRef<string | null>(null)
  const autoSkipNextRef = useRef<(() => void) | null>(null)
  const guideAudioRef = useRef<HTMLAudioElement | null>(null)

  // --- Side-effect hooks ---
  useAudioSideEffects({
    state: audioState,
    refs: { bgPlayerRef, bgPlayerReadyRef, soundscapePlayerRef, soundscapeReadyRef, bgProgressIntervalRef, keepaliveRef, wakeLockRef, currentBgVideoIdRef, currentScVideoIdRef },
    audioContext,
    dispatch,
  })

  useVisibilityResume({
    state: audioState,
    bgPlayerRef, bgPlayerReadyRef,
    soundscapePlayerRef, soundscapeReadyRef,
    currentBgVideoIdRef, currentScVideoIdRef,
    guideAudioRef, wakeLockRef,
  })

  // Stop all audio helper
  const stopAllHomeAudio = useCallback(() => {
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.stopVideo() } catch {}
    }
    if (bgProgressIntervalRef.current) {
      clearInterval(bgProgressIntervalRef.current)
      bgProgressIntervalRef.current = null
    }
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.stopVideo() } catch {}
    }
    currentBgVideoIdRef.current = null
    currentScVideoIdRef.current = null
    if (keepaliveRef.current) {
      keepaliveRef.current.pause()
      keepaliveRef.current.src = ''
      keepaliveRef.current = null
    }
    if (wakeLockRef.current) {
      try { wakeLockRef.current.release() } catch {}
      wakeLockRef.current = null
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none'
      navigator.mediaSession.metadata = null
    }
    dispatch({ type: 'STOP_ALL' })
  }, [dispatch])

  useMediaSession({
    state: audioState,
    dispatch,
    guideAudioRef,
    onStopAll: stopAllHomeAudio,
  })

  // --- Load YouTube IFrame API ---
  const [ytReady, setYtReady] = useState(false)
  useEffect(() => {
    if (window.YT && window.YT.Player) { setYtReady(true); return }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const first = document.getElementsByTagName('script')[0]
    first.parentNode?.insertBefore(tag, first)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); setYtReady(true) }
  }, [])

  // --- Pre-create YT players ---
  useEffect(() => {
    if (!ytReady) return

    const observe = (container: HTMLDivElement | null) => {
      if (!container) return null
      const obs = new MutationObserver(mutations => {
        for (const m of mutations)
          for (const n of m.addedNodes)
            if (n instanceof HTMLIFrameElement) n.allow = 'autoplay; encrypted-media'
      })
      obs.observe(container, { childList: true, subtree: true })
      return obs
    }
    const obs1 = observe(bgPlayerContainerRef.current)
    const obs2 = observe(soundscapeContainerRef.current)

    // Background music player
    if (!bgPlayerRef.current && bgPlayerContainerRef.current) {
      bgPlayerContainerRef.current.innerHTML = ''
      const div = document.createElement('div')
      div.id = 'bg-yt-pre'
      bgPlayerContainerRef.current.appendChild(div)
      bgPlayerRef.current = new window.YT.Player('bg-yt-pre', {
        height: '1', width: '1',
        playerVars: { controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0, showinfo: 0, playsinline: 1 },
        events: {
          onReady: () => { bgPlayerReadyRef.current = true },
          onStateChange: (event) => {
            if (event.data === 1) {
              dispatch({ type: 'MUSIC_YT_PLAYING' })
              if (bgProgressIntervalRef.current) clearInterval(bgProgressIntervalRef.current)
              bgProgressIntervalRef.current = setInterval(() => {
                if (bgPlayerRef.current) {
                  try {
                    const ct = bgPlayerRef.current.getCurrentTime()
                    const d = bgPlayerRef.current.getDuration()
                    dispatch({ type: 'MUSIC_TIME_UPDATE', currentTime: ct, duration: d })
                  } catch {}
                }
              }, 1000)
            } else if (event.data === 2) {
              dispatch({ type: 'MUSIC_YT_PAUSED' })
            } else if (event.data === 0) {
              if (autoSkipNextRef.current) {
                autoSkipNextRef.current()
              } else {
                try { event.target.seekTo(0, true); event.target.playVideo() } catch {}
              }
            }
          },
        },
      })
    }

    // Soundscape player
    if (!soundscapePlayerRef.current && soundscapeContainerRef.current) {
      soundscapeContainerRef.current.innerHTML = ''
      const div = document.createElement('div')
      div.id = 'sc-yt-pre'
      soundscapeContainerRef.current.appendChild(div)
      soundscapePlayerRef.current = new window.YT.Player('sc-yt-pre', {
        height: '1', width: '1',
        playerVars: { controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0, showinfo: 0, playsinline: 1 },
        events: {
          onReady: () => { soundscapeReadyRef.current = true },
          onStateChange: (event) => {
            if (event.data === 1) dispatch({ type: 'SOUNDSCAPE_YT_PLAYING' })
            else if (event.data === 2) dispatch({ type: 'SOUNDSCAPE_YT_PAUSED' })
            else if (event.data === 0) {
              try { event.target.seekTo(0, true); event.target.playVideo() } catch {}
            }
          },
        },
      })
    }

    return () => { obs1?.disconnect(); obs2?.disconnect() }
  }, [ytReady, dispatch])

  // --- Imperative player helpers ---
  const createSoundscapePlayer = useCallback((youtubeId: string) => {
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      currentScVideoIdRef.current = youtubeId
      soundscapePlayerRef.current.loadVideoById(youtubeId)
      soundscapePlayerRef.current.setVolume(100)
    }
  }, [])

  const createBgMusicPlayer = useCallback((youtubeId: string) => {
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      currentBgVideoIdRef.current = youtubeId
      bgPlayerRef.current.loadVideoById(youtubeId)
      bgPlayerRef.current.setVolume(80)
    }
  }, [])

  const stopBackgroundMusic = useCallback(() => {
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.stopVideo() } catch {}
    }
    if (bgProgressIntervalRef.current) {
      clearInterval(bgProgressIntervalRef.current)
      bgProgressIntervalRef.current = null
    }
    currentBgVideoIdRef.current = null
    dispatch({ type: 'STOP_MUSIC' })
  }, [dispatch])

  // --- Auto-pause on daily guide navigation ---
  const wasPausedForDailyGuideRef = useRef(false)
  useEffect(() => {
    const isDailyGuide = pathname === '/daily-guide'
    if (isDailyGuide && audioState.homeAudioActive) {
      // Pause all active audio (preserve state for resume)
      if (audioState.musicPlaying) {
        dispatch({ type: 'PAUSE_MUSIC' })
      }
      if (audioState.soundscapeIsPlaying) {
        dispatch({ type: 'PAUSE_SOUNDSCAPE' })
      }
      if (audioState.guideIsPlaying && guideAudioRef.current) {
        guideAudioRef.current.pause()
        dispatch({ type: 'PAUSE_GUIDE' })
      }
      wasPausedForDailyGuideRef.current = true
    }
  }, [pathname, audioState.homeAudioActive, audioState.musicPlaying, audioState.soundscapeIsPlaying, audioState.guideIsPlaying, dispatch])

  // --- Context value ---
  const refs: HomeAudioRefs = useMemo(() => ({
    bgPlayerRef, bgPlayerReadyRef,
    soundscapePlayerRef, soundscapeReadyRef,
    bgProgressIntervalRef, currentBgVideoIdRef, currentScVideoIdRef,
    keepaliveRef, wakeLockRef, guideAudioRef, autoSkipNextRef,
  }), [])

  const value = useMemo<HomeAudioContextType>(() => ({
    audioState,
    dispatch,
    refs,
    createBgMusicPlayer,
    createSoundscapePlayer,
    stopBackgroundMusic,
    stopAllHomeAudio,
  }), [audioState, dispatch, refs, createBgMusicPlayer, createSoundscapePlayer, stopBackgroundMusic, stopAllHomeAudio])

  return (
    <HomeAudioContext.Provider value={value}>
      {children}
      {/* Hidden YouTube player containers — persist across navigation */}
      <div
        ref={bgPlayerContainerRef}
        className="fixed -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden pointer-events-none"
        style={{ zIndex: -1 }}
      />
      <div
        ref={soundscapeContainerRef}
        className="fixed -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden pointer-events-none"
        style={{ zIndex: -1 }}
      />
    </HomeAudioContext.Provider>
  )
}
