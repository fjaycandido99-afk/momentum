'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Settings, PenLine, Home, Save, ChevronRight, Sun, Sunrise, Moon, BarChart3, Headphones } from 'lucide-react'
import { CoachAvatar } from '@/components/coach/CoachAvatar'
import { SpiralLogo } from './SpiralLogo'
import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import { useHomeAudio } from '@/contexts/HomeAudioContext'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'
import { StreakBadge } from '@/components/daily-guide/StreakDisplay'
import { BottomPlayerBar } from './BottomPlayerBar'
import { DailySpark } from './DailySpark'
import { CoachGreetingBubble } from './CoachGreetingBubble'
import { trackFeature } from '@/lib/analytics/track'
import { SoundscapesSection } from './SoundscapesSection'
import { GuidedSection } from './GuidedSection'
import { GuidedPlayer } from '@/components/player/GuidedPlayer'
import { XPBadge } from './XPBadge'
const MotivationSection = dynamic(() => import('./MotivationSection').then(m => m.MotivationSection), { ssr: false })
import { MusicTabsSection } from './MusicTabsSection'
import { WelcomeBackCard } from './WelcomeBackCard'
import { WisdomSection } from './WisdomSection'
import { HeroCarousel } from './HeroCarousel'
import { SavedMotivationSection } from './SavedMotivationSection'
import {
  Mode, VideoItem, MUSIC_GENRES, getGenreBackgrounds,
  getTimeContext, getSuggestedMode, getTodaysTopicName, getTodaysBackgrounds,
  getMoodTopicName,
} from './home-types'
import { getDateString } from '@/lib/daily-guide/day-type'
import { useAudioOptional } from '@/contexts/AudioContext'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { FREEMIUM_LIMITS } from '@/lib/subscription-constants'
import { PreviewPaywall, PreviewTimer, usePreview } from '@/components/premium/SoftLock'
import { useScrollReveal, useParallax, useMagneticHover, useRippleBurst } from '@/hooks/useHomeAnimations'
import { useSectionTransitions } from '@/hooks/useSectionTransitions'
import { useScrollHeader } from '@/hooks/useScrollHeader'
import { useListeningMilestones } from '@/hooks/useListeningMilestones'
import { AmbientMixer } from './AmbientMixer'
import { LongPressPreview } from './LongPressPreview'
import { WellnessWidget } from './WellnessWidget'
import { DailyFeatureTip } from './DailyFeatureTip'
import { SmartHomeNudge } from './SmartHomeNudge'
import { DailyIntentionCard } from './DailyIntentionCard'
import { DailyProgressRing } from './DailyProgressRing'
import { useToast } from '@/contexts/ToastContext'
import { usePreferences, useJournalMood, useMotivationVideos, useFavorites, useWelcomeStatus, useGamificationStatus } from '@/hooks/useHomeSWR'
import { useListeningStats, checkAudioAchievements } from '@/hooks/useListeningStats'
import { getAdaptiveSectionOrder, type FeedSection } from '@/lib/smart-home-feed'
import { useAchievementOptional } from '@/contexts/AchievementContext'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { haptic } from '@/lib/haptics'
import { isNativePlatform } from '@/lib/guide-audio-native'
import { AudioVisualizer } from '@/components/player/AudioVisualizer'
import { TierBanner } from '@/components/premium/TierBanner'
import { useFeatureTooltip, type FeatureId } from '@/components/premium/FeatureTooltip'

const WordAnimationPlayer = dynamic(
  () => import('@/components/player/WordAnimationPlayer').then(mod => mod.WordAnimationPlayer),
  { ssr: false }
)

const SoundscapePlayerComponent = dynamic(
  () => import('@/components/player/SoundscapePlayer').then(mod => mod.SoundscapePlayer),
  { ssr: false }
)

function getDailyGuideCTA(): { subtitle: string; Icon: typeof Sun } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return { subtitle: 'Morning Prime ready', Icon: Sunrise }
  if (hour >= 11 && hour < 16) return { subtitle: 'Midday Reset ready', Icon: Sun }
  if (hour >= 16 && hour < 21) return { subtitle: 'Time to Wind Down', Icon: Moon }
  return { subtitle: 'Bedtime Story awaits', Icon: Moon }
}

export function ImmersiveHome() {
  const [timeContext] = useState(getTimeContext)
  const [activeMode, setActiveMode] = useState<Mode>(timeContext.suggested)
  const [isPlaying, setIsPlaying] = useState(false)
  const [guideCTA, setGuideCTA] = useState<{ subtitle: string; Icon: typeof Sun }>({ subtitle: '', Icon: Sun })
  const [mounted, setMounted] = useState(false)
  const audioContext = useAudioOptional()
  const mindsetCtx = useMindsetOptional()
  const hasRestoredRef = useRef(false)
  const isRestorePendingRef = useRef(!!audioContext?.lastPlayed)

  // Audio state machine (from persistent context)
  const { audioState, dispatch, refs: homeAudioRefs, createBgMusicPlayer, createSoundscapePlayer, stopBackgroundMusic, stopAllHomeAudio } = useHomeAudio()
  const { bgPlayerRef, bgPlayerReadyRef, soundscapePlayerRef, soundscapeReadyRef, bgProgressIntervalRef, currentBgVideoIdRef, currentScVideoIdRef, keepaliveRef, wakeLockRef, guideAudioRef, guideNativeLoadedRef, autoSkipNextRef } = homeAudioRefs

  // Welcome back card
  const [showWelcomeBack, setShowWelcomeBack] = useState(false)

  // Toast system
  const { showToast } = useToast()
  const showShuffleToast = useCallback((message: string) => {
    showToast({ message, type: 'info', duration: 2000 })
  }, [showToast])

  // Achievement context
  const achievementCtx = useAchievementOptional()

  // Listening stats (#6 — persistent tracking)
  const listeningCategory = audioState.backgroundMusic ? (audioState.currentPlaylist?.type || 'music') : audioState.activeSoundscape ? 'soundscape' : null
  const listeningGenre = audioState.currentPlaylist?.genreId || null
  const { getStats } = useListeningStats(
    audioState.musicPlaying || audioState.soundscapeIsPlaying,
    listeningCategory,
    listeningGenre,
  )

  // Audio achievement check — runs every 60s while playing
  const audioAchievementsCheckedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!audioState.musicPlaying && !audioState.soundscapeIsPlaying) return
    if (!achievementCtx) return

    const check = () => {
      const stats = getStats()
      const earned = checkAudioAchievements(stats)
      const newOnes = earned.filter(id => !audioAchievementsCheckedRef.current.has(id))
      if (newOnes.length > 0) {
        newOnes.forEach(id => audioAchievementsCheckedRef.current.add(id))
        const minimal = newOnes.map(id => {
          const def = ACHIEVEMENTS.find(a => a.id === id)
          return { id, title: def?.title || id, xpReward: def?.xpReward || 25 }
        })
        achievementCtx.triggerAchievements(minimal)
      }
    }
    check() // check immediately
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [audioState.musicPlaying, audioState.soundscapeIsPlaying, achievementCtx, getStats])

  // Listening milestones
  useListeningMilestones(audioState.musicPlaying, useCallback((minutes: number) => {
    const messages: Record<number, string> = {
      15: '15 min of focus — keep going!',
      30: '30 min deep — you\'re in the zone',
      60: '1 hour of flow — incredible!',
    }
    showToast({ message: messages[minutes] || `${minutes} min milestone!`, type: 'milestone' })
    if (navigator.vibrate) navigator.vibrate(50)
  }, [showToast]))

  // Long-press preview
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const handleLongPressStart = useCallback((video: VideoItem) => {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(30)
      setPreviewVideo(video)
    }, 500)
  }, [])
  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // Subscription context for freemium gating
  const { isPremium, isContentFree, dailyFreeUnlockUsed, useDailyFreeUnlock, openUpgradeModal } = useSubscription()

  // Feature tooltip for locked content
  const featureTooltipCtx = useFeatureTooltip()

  // Preview paywall state
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallContentName, setPaywallContentName] = useState('')
  const [previewUnlockCallback, setPreviewUnlockCallback] = useState<(() => void) | null>(null)

  // Preview timer hook
  const handlePreviewEnd = useCallback(() => {
    // Stop all audio
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.pauseVideo() } catch {}
    }
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.pauseVideo() } catch {}
    }
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
    }
    // Update state so player UI reflects paused state
    dispatch({ type: 'PAUSE_MUSIC' })
    setShowPaywall(true)
  }, [dispatch])

  const { isPreviewActive, secondsLeft, startPreview, stopPreview } = usePreview({
    onPreviewEnd: handlePreviewEnd,
    previewDuration: FREEMIUM_LIMITS.previewSeconds,
  })

  // Ambient mixer
  const [showMixer, setShowMixer] = useState(false)

  // Coach nudge animation state
  const [isCoachNudging, setIsCoachNudging] = useState(false)

  // Hamburger menu
  const [showMenu, setShowMenu] = useState(false)

  // Overlays
  const [showMorningFlow, setShowMorningFlow] = useState(false)
  const [showGuidedPlayer, setShowGuidedPlayer] = useState(false)
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null)
  const [guideAudioElement, setGuideAudioElement] = useState<HTMLAudioElement | null>(null)

  const guideRequestId = useRef(0)

  // Debounce ref
  const toggleDebounceRef = useRef(false)
  const TOGGLE_DEBOUNCE_MS = 300

  const debouncedToggle = useCallback((action: () => void) => {
    if (toggleDebounceRef.current) return
    toggleDebounceRef.current = true
    action()
    setTimeout(() => { toggleDebounceRef.current = false }, TOGGLE_DEBOUNCE_MS)
  }, [])

  // Side-effect hooks are now in HomeAudioProvider

  // stopAllHomeAudio and useMediaSession are now in HomeAudioProvider

  // Client-only: set time-dependent values to avoid hydration mismatch
  useEffect(() => {
    setGuideCTA(getDailyGuideCTA())
    setMounted(true)
  }, [])

  // YT players, createSoundscapePlayer, createBgMusicPlayer, stopBackgroundMusic
  // are now provided by HomeAudioProvider via useHomeAudio()

  // When daily guide starts, stop home audio
  useEffect(() => {
    if (audioContext?.isSessionActive && !audioState.homeAudioActive) {
      stopAllHomeAudio()
    }
  }, [audioContext?.isSessionActive, audioState.homeAudioActive, stopAllHomeAudio])

  // --- Guide playback ---
  const handlePlayGuide = async (guideId: string, guideName: string) => {
    haptic('light')
    trackFeature('guided', 'use')
    setActiveGuideId(guideId)
    setShowGuidedPlayer(true)
    // Stop any existing guide audio
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    setGuideAudioElement(null)
    const thisRequest = ++guideRequestId.current

    if (isPlaying) setIsPlaying(false)
    // Stop soundscape imperative
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.stopVideo() } catch {}
    }
    currentScVideoIdRef.current = null
    // Stop music imperative
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.stopVideo() } catch {}
    }

    dispatch({ type: 'PLAY_GUIDE', guideId, guideName })

    try {
      const typeMap: Record<string, string> = { anxiety: 'grounding' }
      const mappedType = typeMap[guideId] || guideId

      // Pass guest tone preference from localStorage
      let guestTone: string | undefined
      try {
        const guestPrefs = localStorage.getItem('voxu_guest_prefs')
        if (guestPrefs) guestTone = JSON.parse(guestPrefs).guide_tone
      } catch {}

      const response = await fetch('/api/daily-guide/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mappedType, ...(guestTone && { tone: guestTone }) }),
      })
      if (!response.ok) {
        console.error('[Guide] Voices API error:', response.status)
        dispatch({ type: 'GUIDE_ERROR' })
        return
      }
      const data = await response.json()

      if (guideRequestId.current !== thisRequest) return

      if (data.audioBase64) {
        // Convert base64 to blob URL on all platforms for consistent playback
        let blobUrl: string | null = null
        try {
          // Try fetch(data:URI) first — efficient and avoids atob memory spikes
          const res = await fetch(`data:audio/mpeg;base64,${data.audioBase64}`)
          const blob = await res.blob()
          blobUrl = URL.createObjectURL(blob)
        } catch {
          // Fallback: atob for environments where fetch(data:URI) fails
          try {
            const bin = atob(data.audioBase64)
            const bytes = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
            blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
          } catch {
            // Last resort: data URI directly
            blobUrl = null
          }
        }
        if (guideRequestId.current !== thisRequest) return

        const audioSrc = blobUrl || `data:audio/mpeg;base64,${data.audioBase64}`
        const audio = new Audio(audioSrc)
        guideAudioRef.current = audio
        setGuideAudioElement(audio)

        let playAttempted = false
        const tryPlay = () => {
          if (playAttempted) return
          playAttempted = true
          if (guideRequestId.current !== thisRequest) {
            audio.pause(); audio.src = ''
            if (blobUrl) URL.revokeObjectURL(blobUrl)
            return
          }
          audio.play()
            .then(() => {
              setGuideAudioElement(audio)
              dispatch({ type: 'GUIDE_PLAY_STARTED' })
            })
            .catch(err => {
              console.error('Guide play error:', err)
              playAttempted = false // allow retry
              // Retry once on native (autoplay policies)
              if (isNativePlatform) {
                setTimeout(() => {
                  playAttempted = true
                  audio.play()
                    .then(() => {
                      setGuideAudioElement(audio)
                      dispatch({ type: 'GUIDE_PLAY_STARTED' })
                    })
                    .catch(() => dispatch({ type: 'GUIDE_ERROR' }))
                }, 500)
              }
            })
        }
        // Use both events — oncanplay fires earlier and more reliably on native
        audio.oncanplay = tryPlay
        audio.oncanplaythrough = tryPlay
        audio.onended = () => {
          if (guideRequestId.current !== thisRequest) return
          dispatch({ type: 'GUIDE_ENDED' })
          if (blobUrl) URL.revokeObjectURL(blobUrl)
        }
        audio.onerror = () => {
          if (guideRequestId.current !== thisRequest) return
          dispatch({ type: 'GUIDE_ERROR' })
          if (blobUrl) URL.revokeObjectURL(blobUrl)
        }
      } else {
        // No audio available — show error instead of browser TTS fallback
        dispatch({ type: 'GUIDE_ERROR' })
      }
    } catch (err) {
      console.error('Guide fetch error:', err)
      if (guideRequestId.current === thisRequest) {
        dispatch({ type: 'GUIDE_ERROR' })
      }
    } finally {
      if (guideRequestId.current === thisRequest) {
        dispatch({ type: 'GUIDE_LOADED' })
      }
    }
  }

  const toggleGuidePlay = () => {
    haptic('light')
    if (audioState.guideIsPlaying) {
      if (guideAudioRef.current) guideAudioRef.current.pause()
      dispatch({ type: 'PAUSE_GUIDE' })
    } else {
      if (guideAudioRef.current) {
        guideAudioRef.current.play()
          .then(() => dispatch({ type: 'RESUME_GUIDE' }))
          .catch(console.error)
      }
    }
  }

  // --- Pull-down gesture ---
  const scrollRef = useRef<HTMLDivElement>(null)
  useScrollReveal(scrollRef)
  useSectionTransitions(scrollRef)
  useParallax(scrollRef)
  const { handlePointerMove: magneticMove, handlePointerLeave: magneticLeave } = useMagneticHover()
  const spawnRipple = useRippleBurst()
  const { scrolled: headerScrolled, scrollY: headerScrollY } = useScrollHeader(scrollRef)


  // --- Data fetching (SWR) ---
  const topicName = getTodaysTopicName()
  const [backgrounds] = useState(getTodaysBackgrounds)
  const [today, setToday] = useState(() => getDateString(new Date()))

  // Refresh date when app resumes on a new day
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const fresh = getDateString(new Date())
      if (fresh !== today) setToday(fresh)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [today])

  // SWR: Preferences
  const { streak, mutatePreferences } = usePreferences()

  // SWR: Journal mood
  const { journalData, journalMood, journalLoading, moodBefore, energyLevel, hasJournaledToday, modulesCompletedToday, dailyIntention } = useJournalMood(today)

  // SWR: Gamification status (for bonus, freezes)
  const { dailyBonusClaimed, streakFreezes } = useGamificationStatus()

  // Adjust mode based on journal mood
  useEffect(() => {
    if (moodBefore || energyLevel) {
      const suggested = getSuggestedMode(moodBefore, energyLevel, timeContext.suggested)
      setActiveMode(suggested)
    }
  }, [moodBefore, energyLevel, timeContext.suggested])

  const moodTopic = getMoodTopicName(journalMood)
  const featuredTopic = moodTopic || topicName

  // Adaptive section ordering (#2)
  const sectionOrder = useMemo(() => getAdaptiveSectionOrder({
    journalMood,
    energyLevel,
    timeOfDay: timeContext.suggested,
    streak,
    lastPlayedType: audioContext?.lastPlayed?.type || null,
    mindsetId: mindsetCtx?.mindset || null,
  }), [journalMood, energyLevel, timeContext.suggested, streak, audioContext?.lastPlayed?.type, mindsetCtx?.mindset])

  // SWR: Motivation videos (featured topic)
  const { motivationVideos: featuredMotivationVideos, motivationLoading: loadingMotivation, mutateMotivation: mutateFeaturedMotivation } = useMotivationVideos(featuredTopic)
  // SWR: Motivation for default topic (if mood overrides)
  const { motivationVideos: defaultMotivationVideos } = useMotivationVideos(moodTopic && moodTopic !== topicName ? topicName : '')

  // Combined motivation: quick lookup for restore + shuffle
  const motivationByTopic = useMemo(() => {
    const map: Record<string, VideoItem[]> = {}
    if (featuredMotivationVideos.length > 0) map[featuredTopic] = featuredMotivationVideos
    if (defaultMotivationVideos.length > 0 && moodTopic && moodTopic !== topicName) map[topicName] = defaultMotivationVideos
    return map
  }, [featuredMotivationVideos, defaultMotivationVideos, featuredTopic, topicName, moodTopic])
  const motivationVideos = motivationByTopic[topicName] || featuredMotivationVideos

  // SWR: Favorites
  const { savedVideos: savedMotivationVideos, favoriteIds, favoriteRecordMap, mutateFavorites: mutateMotivationFavorites } = useFavorites('motivation')
  const { savedVideos: savedMusicVideos, favoriteIds: musicFavoriteIds, favoriteRecordMap: musicFavoriteRecordMap, mutateFavorites: mutateMusicFavorites } = useFavorites('music')

  // SWR: Welcome back
  const { shouldShow: shouldShowWelcome, daysAway: welcomeDaysAway, lastStreak: welcomeLastStreak } = useWelcomeStatus()

  // Welcome back (SWR-driven)
  useEffect(() => {
    if (shouldShowWelcome) setShowWelcomeBack(true)
  }, [shouldShowWelcome])

  // Genre data is now lazy-loaded (Phase 4) — kept as state for sections that load eagerly
  const [genreVideos, setGenreVideos] = useState<Record<string, VideoItem[]>>({})
  const [genreBackgrounds, setGenreBackgrounds] = useState<Record<string, string[]>>({})
  const [loadingGenres, setLoadingGenres] = useState<Record<string, boolean>>(
    () => Object.fromEntries(MUSIC_GENRES.map(g => [g.id, true]))
  )

  const [shufflingTopic, setShufflingTopic] = useState<string | null>(null)
  const [shufflingGenre, setShufflingGenre] = useState<string | null>(null)

  // Revalidate preferences on focus (e.g. back from settings)
  useEffect(() => {
    const handler = () => mutatePreferences()
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [mutatePreferences])

  // --- Restore last played ---
  // Phase 1: Immediately set backgroundMusic/activeSoundscape so the BottomPlayerBar
  // never falls through to the default soundscape during the restore window.
  const hasPlaylistRestoredRef = useRef(false)

  const restoreStartSecondsRef = useRef<number | undefined>(undefined)
  const needsRestorePlaybackRef = useRef(false)

  useEffect(() => {
    if (hasRestoredRef.current) return
    const lastPlayed = audioContext?.lastPlayed
    if (!lastPlayed) {
      isRestorePendingRef.current = false
      return
    }
    if (audioContext?.isSessionActive) return
    hasRestoredRef.current = true

    // Save the seek position for Phase 3
    restoreStartSecondsRef.current = lastPlayed.currentTime

    if (lastPlayed.type === 'music' && lastPlayed.genreId && lastPlayed.videoId) {
      const genre = MUSIC_GENRES.find(g => g.id === lastPlayed.genreId)
      if (genre) {
        dispatch({
          type: 'RESTORE_LAST_PLAYED',
          partial: {
            backgroundMusic: { youtubeId: lastPlayed.videoId, label: lastPlayed.genreWord || genre.word },
            musicPlaying: false,
            userPausedMusic: true,
            homeAudioActive: true,
          },
        })
      }
    } else if (lastPlayed.type === 'motivation' && lastPlayed.videoId) {
      dispatch({
        type: 'RESTORE_LAST_PLAYED',
        partial: {
          backgroundMusic: { youtubeId: lastPlayed.videoId, label: lastPlayed.label || topicName },
          musicPlaying: false,
          userPausedMusic: true,
          homeAudioActive: true,
        },
      })
    } else if (lastPlayed.type === 'soundscape' && lastPlayed.soundscapeId) {
      const item = SOUNDSCAPE_ITEMS.find(i => i.id === lastPlayed.soundscapeId)
      if (item) {
        dispatch({
          type: 'RESTORE_LAST_PLAYED',
          partial: {
            activeSoundscape: { soundId: item.id, label: item.label, subtitle: item.subtitle, youtubeId: item.youtubeId },
            soundscapeIsPlaying: false,
            userPausedSoundscape: true,
          },
        })
      }
    }
    // Clear pending flag after dispatch propagates
    isRestorePendingRef.current = false
  }, [audioContext?.lastPlayed, audioContext?.isSessionActive, topicName, dispatch])

  // Phase 3: Once YT player is ready, load the restored video at saved position
  useEffect(() => {
    if (!needsRestorePlaybackRef.current) return
    if (!audioState.backgroundMusic) return

    const videoId = audioState.backgroundMusic.youtubeId
    const startSeconds = restoreStartSecondsRef.current

    // Poll for player readiness (YT player may not be ready yet on page load)
    const tryLoad = () => {
      if (bgPlayerReadyRef.current && bgPlayerRef.current) {
        needsRestorePlaybackRef.current = false
        createBgMusicPlayer(videoId, startSeconds)
        return true
      }
      return false
    }

    if (tryLoad()) return

    const interval = setInterval(() => {
      if (tryLoad()) clearInterval(interval)
    }, 200)

    return () => clearInterval(interval)
  }, [audioState.backgroundMusic, bgPlayerRef, bgPlayerReadyRef, createBgMusicPlayer])

  // Phase 2: Once genre/motivation videos load, upgrade the restore with full playlist data.
  // This runs reactively on genreVideos/motivationByTopic changes — no stale closure issues.
  useEffect(() => {
    if (hasPlaylistRestoredRef.current) return
    if (!hasRestoredRef.current) return // Phase 1 hasn't run yet
    const lastPlayed = audioContext?.lastPlayed
    if (!lastPlayed) return

    if (lastPlayed.type === 'music' && lastPlayed.genreId && lastPlayed.videoId) {
      const videos = genreVideos[lastPlayed.genreId]
      if (!videos || videos.length === 0) return // Not loaded yet — will re-run when it loads
      const genre = MUSIC_GENRES.find(g => g.id === lastPlayed.genreId)
      if (!genre) return
      hasPlaylistRestoredRef.current = true
      const videoIndex = lastPlayed.playlistIndex ?? 0
      const video = videos[videoIndex]
      dispatch({
        type: 'RESTORE_LAST_PLAYED',
        partial: {
          backgroundMusic: { youtubeId: lastPlayed.videoId, label: lastPlayed.genreWord || genre.word },
          musicPlaying: false,
          userPausedMusic: true,
          homeAudioActive: true,
          activeCardId: video?.id || null,
          currentPlaylist: {
            videos: videos.slice(0, 8),
            index: videoIndex,
            type: 'music',
            genreId: lastPlayed.genreId,
            genreWord: lastPlayed.genreWord || genre.word,
          },
        },
      })
    } else if (lastPlayed.type === 'motivation' && lastPlayed.videoId) {
      const restoredTopic = lastPlayed.label || topicName
      const topicVideos = motivationByTopic[restoredTopic] || motivationVideos
      if (topicVideos.length === 0) return // Not loaded yet
      hasPlaylistRestoredRef.current = true
      const videoIndex = lastPlayed.playlistIndex ?? 0
      const video = topicVideos[videoIndex]
      dispatch({
        type: 'RESTORE_LAST_PLAYED',
        partial: {
          backgroundMusic: { youtubeId: lastPlayed.videoId, label: restoredTopic },
          musicPlaying: false,
          userPausedMusic: true,
          homeAudioActive: true,
          activeCardId: video?.id || null,
          currentPlaylist: {
            videos: topicVideos.slice(0, 8),
            index: videoIndex,
            type: 'motivation',
          },
        },
      })
    } else {
      // Soundscape — no playlist needed, already fully restored in phase 1
      hasPlaylistRestoredRef.current = true
    }
  }, [audioContext?.lastPlayed, genreVideos, motivationVideos, motivationByTopic, topicName, dispatch])

  // --- Periodic save of playback position (every 10 seconds) + save on page unload ---
  const lastSaveTimeRef = useRef(0)
  useEffect(() => {
    if (!audioState.musicPlaying || !audioState.backgroundMusic || !audioContext) return
    const now = Date.now()
    if (now - lastSaveTimeRef.current < 10000) return
    lastSaveTimeRef.current = now

    const lp = audioContext.lastPlayed
    if (lp && lp.videoId === audioState.backgroundMusic.youtubeId) {
      audioContext.setLastPlayed({ ...lp, currentTime: audioState.musicCurrentTime })
    }
  }, [audioState.musicCurrentTime, audioState.musicPlaying, audioState.backgroundMusic, audioContext])

  // Save position immediately on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!audioState.backgroundMusic || !audioContext?.lastPlayed) return
      const lp = audioContext.lastPlayed
      if (lp && lp.videoId === audioState.backgroundMusic.youtubeId && audioState.musicCurrentTime > 0) {
        const updated = { ...lp, currentTime: audioState.musicCurrentTime, timestamp: Date.now() }
        try {
          localStorage.setItem('voxu_last_played', JSON.stringify(updated))
        } catch {}
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [audioState.backgroundMusic, audioState.musicCurrentTime, audioContext])

  // --- Card tap animation ---
  const triggerTap = (videoId: string) => {
    dispatch({ type: 'TAP_CARD', videoId })
    setTimeout(() => dispatch({ type: 'CLEAR_TAP' }), 400)
  }

  // --- Play handlers ---
  const handlePlayMotivation = (video: VideoItem, index: number, topic?: string) => {
    haptic('light')
    trackFeature('motivation', 'use')
    const playTopic = topic || topicName
    const topicVideos = motivationByTopic[playTopic] || motivationVideos
    triggerTap(video.id)
    // Stop guide audio imperatively
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    if (isPlaying) setIsPlaying(false)
    // Stop soundscape imperatively
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.stopVideo() } catch {}
    }
    currentScVideoIdRef.current = null

    const bg = backgrounds[index % backgrounds.length]
    dispatch({
      type: 'PLAY_MUSIC',
      youtubeId: video.youtubeId,
      label: playTopic,
      cardId: video.id,
      playlist: { videos: topicVideos.slice(0, 8), index, type: 'motivation' },
      playingSound: { word: playTopic, color: 'from-white/[0.06] to-white/[0.02]', youtubeId: video.youtubeId, backgroundImage: bg },
    })
    createBgMusicPlayer(video.youtubeId)

    audioContext?.setLastPlayed({
      type: 'motivation', videoId: video.youtubeId, label: playTopic, playlistIndex: index,
    })
  }

  const handlePlayMusic = (video: VideoItem, index: number, genreId: string, genreWord: string) => {
    haptic('light')
    trackFeature('music', 'use')
    triggerTap(video.id)
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    if (isPlaying) setIsPlaying(false)
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.stopVideo() } catch {}
    }
    currentScVideoIdRef.current = null

    const genreVids = (genreVideos[genreId] || []).slice(0, 8)
    const gBgs = genreBackgrounds[genreId]?.length > 0 ? genreBackgrounds[genreId] : getGenreBackgrounds(genreId)
    const bg = gBgs.length > 0 ? gBgs[index % gBgs.length] : backgrounds[(index + 15) % backgrounds.length]

    dispatch({
      type: 'PLAY_MUSIC',
      youtubeId: video.youtubeId,
      label: genreWord,
      cardId: video.id,
      playlist: { videos: genreVids, index, type: 'music', genreId, genreWord },
      playingSound: { word: genreWord, color: 'from-white/[0.06] to-white/[0.02]', youtubeId: video.youtubeId, backgroundImage: bg },
    })
    createBgMusicPlayer(video.youtubeId)

    audioContext?.setLastPlayed({
      type: 'music', genreId, genreWord, videoId: video.youtubeId, label: genreWord, playlistIndex: index,
    })
  }

  const handleClosePlayer = () => dispatch({ type: 'CLOSE_PLAYER' })

  const handleShuffleTopic = useCallback(async (topic: string) => {
    setShufflingTopic(topic)
    try {
      const seed = Date.now()
      const res = await fetch(`/api/motivation-videos?topic=${topic}&shuffle=true&seed=${seed}`)
      const data = res.ok ? await res.json() : { videos: [] }
      const vids = data.videos || []
      // Update SWR cache with shuffled data
      mutateFeaturedMotivation({ videos: vids }, false)
      if (vids.length > 0) showShuffleToast(`Shuffled ${vids.length} videos`)
    } catch {}
    setShufflingTopic(null)
  }, [showShuffleToast, mutateFeaturedMotivation])

  const handleToggleFavorite = useCallback(async (video: VideoItem) => {
    if (navigator.vibrate) navigator.vibrate(50)
    const youtubeId = video.youtubeId
    if (favoriteIds.has(youtubeId)) {
      const recordId = favoriteRecordMap.get(youtubeId)
      if (recordId) {
        try { await fetch('/api/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: recordId }) }) } catch {}
        mutateMotivationFavorites()
      }
    } else {
      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_type: 'motivation',
            content_text: video.title,
            content_id: youtubeId,
            content_title: video.title,
            thumbnail: video.thumbnail || `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
          }),
        })
        mutateMotivationFavorites()
      } catch {}
    }
  }, [favoriteIds, favoriteRecordMap, mutateMotivationFavorites])

  // When lazy genre sections load, store data for restore + play handlers
  const handleGenreDataLoaded = useCallback((genreId: string, videos: VideoItem[], bgs: string[]) => {
    setGenreVideos(prev => ({ ...prev, [genreId]: videos }))
    setGenreBackgrounds(prev => ({ ...prev, [genreId]: bgs }))
    setLoadingGenres(prev => ({ ...prev, [genreId]: false }))
  }, [])

  const handleShuffleGenre = useCallback(async (genreId: string) => {
    setShufflingGenre(genreId)
    try {
      const seed = Date.now()
      const res = await fetch(`/api/music-videos?genre=${genreId}&shuffle=true&seed=${seed}`)
      const data = res.ok ? await res.json() : { videos: [] }
      const vids = data.videos || []
      setGenreVideos(prev => ({ ...prev, [genreId]: vids }))
      if (vids.length > 0) showShuffleToast(`Shuffled ${vids.length} tracks`)
    } catch {}
    setShufflingGenre(null)
  }, [showShuffleToast])

  const handleToggleMusicFavorite = useCallback(async (video: VideoItem) => {
    if (navigator.vibrate) navigator.vibrate(50)
    const youtubeId = video.youtubeId
    if (musicFavoriteIds.has(youtubeId)) {
      const recordId = musicFavoriteRecordMap.get(youtubeId)
      if (recordId) {
        try { await fetch('/api/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: recordId }) }) } catch {}
        mutateMusicFavorites()
      }
    } else {
      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_type: 'music',
            content_text: video.title,
            content_id: youtubeId,
            content_title: video.title,
            thumbnail: video.thumbnail || `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
          }),
        })
        mutateMusicFavorites()
      } catch {}
    }
  }, [musicFavoriteIds, musicFavoriteRecordMap, mutateMusicFavorites])

  const handleMusicSeek = useCallback((seconds: number) => {
    if (bgPlayerRef.current) {
      bgPlayerRef.current.seekTo(seconds, true)
      dispatch({ type: 'MUSIC_TIME_UPDATE', currentTime: seconds, duration: audioState.musicDuration })
    }
  }, [audioState.musicDuration, dispatch])

  // --- Skip ---
  const handleSkipNext = useCallback(() => {
    const pl = audioState.currentPlaylist
    if (!pl || pl.index >= pl.videos.length - 1) return
    const nextIndex = pl.index + 1
    const nextVideo = pl.videos[nextIndex]
    if (!nextVideo) return

    let bg: string | undefined
    if (pl.type === 'motivation') {
      const bgs = getTodaysBackgrounds()
      bg = bgs[nextIndex % bgs.length]
    } else {
      const gid = pl.genreId || ''
      const gBgs = genreBackgrounds[gid]?.length > 0 ? genreBackgrounds[gid] : getGenreBackgrounds(gid)
      bg = gBgs.length > 0 ? gBgs[nextIndex % gBgs.length] : backgrounds[(nextIndex + 15) % backgrounds.length]
    }

    dispatch({
      type: 'SKIP_NEXT', nextVideo, nextIndex, backgroundImage: bg,
      label: pl.type === 'motivation' ? topicName : (pl.genreWord || ''),
    })
    createBgMusicPlayer(nextVideo.youtubeId)

    if (pl.type === 'motivation') {
      audioContext?.setLastPlayed({ type: 'motivation', videoId: nextVideo.youtubeId, label: topicName, playlistIndex: nextIndex })
    } else {
      audioContext?.setLastPlayed({ type: 'music', genreId: pl.genreId, genreWord: pl.genreWord, videoId: nextVideo.youtubeId, label: pl.genreWord || '', playlistIndex: nextIndex })
    }
  }, [audioState.currentPlaylist, topicName, genreBackgrounds, backgrounds, createBgMusicPlayer, audioContext, dispatch])

  const handleSkipPrevious = useCallback(() => {
    const pl = audioState.currentPlaylist
    if (!pl || pl.index <= 0) return
    const prevIndex = pl.index - 1
    const prevVideo = pl.videos[prevIndex]
    if (!prevVideo) return

    let bg: string | undefined
    if (pl.type === 'motivation') {
      const bgs = getTodaysBackgrounds()
      bg = bgs[prevIndex % bgs.length]
    } else {
      const gid = pl.genreId || ''
      const gBgs = genreBackgrounds[gid]?.length > 0 ? genreBackgrounds[gid] : getGenreBackgrounds(gid)
      bg = gBgs.length > 0 ? gBgs[prevIndex % gBgs.length] : backgrounds[(prevIndex + 15) % backgrounds.length]
    }

    dispatch({
      type: 'SKIP_PREVIOUS', prevVideo, prevIndex, backgroundImage: bg,
      label: pl.type === 'motivation' ? topicName : (pl.genreWord || ''),
    })
    createBgMusicPlayer(prevVideo.youtubeId)

    if (pl.type === 'motivation') {
      audioContext?.setLastPlayed({ type: 'motivation', videoId: prevVideo.youtubeId, label: topicName, playlistIndex: prevIndex })
    } else {
      audioContext?.setLastPlayed({ type: 'music', genreId: pl.genreId, genreWord: pl.genreWord, videoId: prevVideo.youtubeId, label: pl.genreWord || '', playlistIndex: prevIndex })
    }
  }, [audioState.currentPlaylist, topicName, genreBackgrounds, backgrounds, createBgMusicPlayer, audioContext, dispatch])

  // Keep autoSkipNextRef in sync
  useEffect(() => {
    const pl = audioState.currentPlaylist
    if (pl && pl.index < pl.videos.length - 1) {
      autoSkipNextRef.current = handleSkipNext
    } else {
      autoSkipNextRef.current = null
    }
  }, [audioState.currentPlaylist, handleSkipNext])

  // --- Section callbacks ---
  const handleSoundscapePlay = useCallback((item: typeof SOUNDSCAPE_ITEMS[number], isLocked: boolean) => {
    haptic('light')
    trackFeature('soundscapes', 'use')
    if (isLocked) {
      // Show educational tooltip first (once per session), then proceed
      if (featureTooltipCtx?.showFeatureTooltip('all_content')) return
      stopPreview()
      setPaywallContentName(item.label)
      setPreviewUnlockCallback(() => () => {
        createSoundscapePlayer(item.youtubeId)
        dispatch({ type: 'SHOW_SOUNDSCAPE_PLAYER' })
      })
    }

    // Stop guide audio imperatively
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    if (isPlaying) setIsPlaying(false)
    // Stop music player imperatively
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.stopVideo() } catch {}
    }

    dispatch({
      type: 'PLAY_SOUNDSCAPE',
      soundscape: { soundId: item.id, label: item.label, subtitle: item.subtitle, youtubeId: item.youtubeId },
    })
    createSoundscapePlayer(item.youtubeId)

    audioContext?.setLastPlayed({ type: 'soundscape', soundscapeId: item.id, label: item.label })

    if (isLocked) startPreview()
  }, [isPlaying, createSoundscapePlayer, stopPreview, startPreview, audioContext, dispatch])

  const handleSoundscapeReopen = useCallback(() => {
    dispatch({ type: 'SHOW_SOUNDSCAPE_PLAYER' })
  }, [dispatch])

  const handleGuidePlay = useCallback((guideId: string, name: string, isLocked: boolean) => {
    if (isLocked) {
      if (featureTooltipCtx?.showFeatureTooltip('guided_voices')) return
      stopPreview()
      setPaywallContentName(name)
      setPreviewUnlockCallback(() => () => handlePlayGuide(guideId, name))
      handlePlayGuide(guideId, name)
      startPreview()
    } else {
      handlePlayGuide(guideId, name)
    }
  }, [stopPreview, startPreview])

  const handleMotivationPlay = useCallback((video: VideoItem, index: number, isLocked: boolean, topic?: string) => {
    if (isLocked) {
      if (featureTooltipCtx?.showFeatureTooltip('all_content')) return
      stopPreview()
      setPaywallContentName(video.title)
      setPreviewUnlockCallback(() => () => handlePlayMotivation(video, index, topic))
      handlePlayMotivation(video, index, topic)
      startPreview()
    } else {
      handlePlayMotivation(video, index, topic)
    }
  }, [stopPreview, startPreview, topicName, motivationByTopic, motivationVideos, backgrounds, createBgMusicPlayer, audioContext, dispatch])

  const handleMusicGenrePlay = useCallback((video: VideoItem, index: number, genreId: string, genreWord: string, isLocked: boolean) => {
    if (isLocked) {
      if (featureTooltipCtx?.showFeatureTooltip('all_content')) return
      stopPreview()
      setPaywallContentName(video.title)
      setPreviewUnlockCallback(() => () => handlePlayMusic(video, index, genreId, genreWord))
      handlePlayMusic(video, index, genreId, genreWord)
      startPreview()
    } else {
      handlePlayMusic(video, index, genreId, genreWord)
    }
  }, [stopPreview, startPreview, genreVideos, genreBackgrounds, backgrounds, createBgMusicPlayer, audioContext, dispatch])

  return (
    <div className="isolate min-h-screen">
    <div
      ref={scrollRef}
      className={`relative min-h-screen text-white pb-28 ${showMorningFlow || audioState.playingSound || audioState.showSoundscapePlayer || showGuidedPlayer ? 'overflow-hidden max-h-screen' : ''}`}
    >
      {/* --- Fullscreen overlays --- */}

      {/* Video/Music Player */}
      {audioState.playingSound && (
        <WordAnimationPlayer
          word={audioState.playingSound.word}
          script=""
          color={audioState.playingSound.color}
          youtubeId={audioState.playingSound.youtubeId}
          onSkipNext={audioState.currentPlaylist && audioState.currentPlaylist.index < audioState.currentPlaylist.videos.length - 1 ? handleSkipNext : undefined}
          onSkipPrevious={audioState.currentPlaylist && audioState.currentPlaylist.index > 0 ? handleSkipPrevious : undefined}
          hasNext={!!audioState.currentPlaylist && audioState.currentPlaylist.index < audioState.currentPlaylist.videos.length - 1}
          hasPrevious={!!audioState.currentPlaylist && audioState.currentPlaylist.index > 0}
          backgroundImage={audioState.playingSound.backgroundImage}
          backgroundImages={audioState.currentPlaylist?.type === 'motivation' ? backgrounds : undefined}
          onClose={handleClosePlayer}
          externalAudio
          externalPlaying={audioState.musicPlaying}
          onTogglePlay={() => debouncedToggle(() => {
            if (audioState.musicPlaying) {
              dispatch({ type: 'PAUSE_MUSIC' })
            } else {
              dispatch({ type: 'RESUME_MUSIC' })
            }
          })}
          externalDuration={audioState.musicDuration}
          externalCurrentTime={audioState.musicCurrentTime}
          onSeek={handleMusicSeek}
          category={audioState.currentPlaylist?.type === 'motivation' ? 'Motivation' : 'Music'}
        />
      )}

      {/* Soundscape Player (fullscreen orb) */}
      {audioState.activeSoundscape && audioState.showSoundscapePlayer && (
        <SoundscapePlayerComponent
          soundId={audioState.activeSoundscape.soundId}
          label={audioState.activeSoundscape.label}
          subtitle={audioState.activeSoundscape.subtitle}
          youtubeId={audioState.activeSoundscape.youtubeId}
          isPlaying={audioState.soundscapeIsPlaying}
          onTogglePlay={() => debouncedToggle(() => {
            if (audioState.soundscapeIsPlaying) {
              dispatch({ type: 'PAUSE_SOUNDSCAPE' })
            } else {
              dispatch({ type: 'RESUME_SOUNDSCAPE' })
            }
          })}
          onClose={() => dispatch({ type: 'HIDE_SOUNDSCAPE_PLAYER' })}
          onSwitchSound={(id, label, subtitle, youtubeId) => {
            dispatch({ type: 'SWITCH_SOUNDSCAPE', soundscape: { soundId: id, label, subtitle, youtubeId } })
            createSoundscapePlayer(youtubeId)
          }}
        />
      )}

      {/* Guided Player */}
      {audioState.guideLabel && showGuidedPlayer && (
        <GuidedPlayer
          guideId={activeGuideId || ''}
          guideName={audioState.guideLabel}
          isPlaying={audioState.guideIsPlaying}
          isLoading={!!audioState.loadingGuide}
          audioElement={guideAudioElement}
          onTogglePlay={toggleGuidePlay}
          onClose={() => setShowGuidedPlayer(false)}
          onSwitchGuide={(id, name) => {
            handlePlayGuide(id, name)
          }}
          onLockedGuide={(id, name) => {
            handleGuidePlay(id, name, true)
          }}
        />
      )}

      {/* Morning Flow Overlay */}
      {showMorningFlow && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in-down">
          <div className="flex-1 overflow-y-auto pb-20">
            <DailyGuideHome embedded />
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-[70] flex justify-center pb-6 pt-3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
            <button
              onClick={() => {
                audioContext?.setSessionActive(false)
                setShowMorningFlow(false)
                // Re-trigger restore on next render by resetting refs
                hasRestoredRef.current = false
                hasPlaylistRestoredRef.current = false
              }}
              className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 active:bg-white/15 backdrop-blur-sm transition-colors"
            >
              <Home className="w-4 h-4 text-white" />
              <span className="text-sm text-white">Home</span>
            </button>
          </div>
        </div>
      )}


      {/* Header — hidden when any fullscreen overlay is active */}
      {!showMorningFlow && !audioState.playingSound && !audioState.showSoundscapePlayer && (
        <div className="sticky top-0 z-50 px-5 pt-12 pb-2 animate-fade-in-down bg-black before:absolute before:content-[''] before:-top-20 before:left-0 before:right-0 before:h-20 before:bg-black"
        >
          {/* Bottom blur fade */}
          <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className={`font-semibold shimmer-text transition-all duration-300 shrink-0 ${headerScrolled ? 'text-lg' : 'text-xl'}`}>Explore</h1>
              <StreakBadge streak={streak} freezeCount={streakFreezes} />
              <XPBadge />
              <DailyProgressRing
                morningDone={!!journalData?.morning_prime_done}
                middayDone={!!journalData?.midday_reset_done}
                windDownDone={!!journalData?.wind_down_done}
                bedtimeDone={!!journalData?.bedtime_story_done}
                hasJournaledToday={hasJournaledToday}
                dailyIntention={!!dailyIntention}
                dailyBonusClaimed={dailyBonusClaimed}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {mindsetCtx && (
                <div className="flex items-center justify-center px-1.5 py-1 rounded-full bg-white/[0.06]">
                  <MindsetIcon mindsetId={mindsetCtx.mindset} className="w-4 h-4 text-white/75" />
                </div>
              )}
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-label={showMenu ? 'Close menu' : 'Open menu'}
                className="p-1 press-scale"
              >
                <SpiralLogo open={showMenu} size={48} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hamburger Menu Dropdown */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} role="presentation" />
          <div className="fixed right-6 top-[100px] z-40 w-48 py-2 rounded-2xl bg-black border border-white/15 shadow-xl animate-fade-in-up">
            <button onClick={() => { setShowMenu(false); stopBackgroundMusic(); setShowMorningFlow(true) }} className="flex items-center gap-3 px-4 py-3 w-full hover:bg-white/5 active:bg-white/5 transition-colors">
              <Headphones className="w-4 h-4 text-white/85" />
              <span className="text-sm text-white/90">Daily Guide</span>
            </button>
            <Link href="/journal" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/5 transition-colors">
              <PenLine className="w-4 h-4 text-white/85" />
              <span className="text-sm text-white/90">Journal</span>
            </Link>
            <Link href="/saved" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/5 transition-colors">
              <Save className="w-4 h-4 text-white/85" />
              <span className="text-sm text-white/90">Saved</span>
            </Link>
            <Link href="/progress" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/5 transition-colors">
              <BarChart3 className="w-4 h-4 text-white/85" />
              <span className="text-sm text-white/90">Progress</span>
            </Link>
            <div className="mx-3 my-1 border-t border-white/15" />
            <Link href="/settings" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/5 transition-colors">
              <Settings className="w-4 h-4 text-white/85" />
              <span className="text-sm text-white/90">Settings</span>
            </Link>
          </div>
        </>
      )}

      {/* Tier-aware instruction banner */}
      <TierBanner page="home" />

      {/* Welcome Back Card */}
      {showWelcomeBack && shouldShowWelcome && (
        <WelcomeBackCard
          daysAway={welcomeDaysAway}
          lastStreak={welcomeLastStreak}
          onDismiss={() => setShowWelcomeBack(false)}
        />
      )}

      {/* Hero Carousel: Daily Guide + Path + Featured */}
      {(() => {
        const slides: React.ReactNode[] = [
          // Slide 1: Daily Guide
          <button
            key="guide"
            onClick={() => { stopBackgroundMusic(); setShowMorningFlow(true) }}
            className="w-full h-full text-left group"
          >
            <div className="relative p-5 card-surface-lg press-scale h-full flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.12]">
                  <guideCTA.Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Your Daily Guide</h2>
                  <p className="text-xs text-white/90">{guideCTA.subtitle}</p>
                </div>
              </div>

              {/* Module progress */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2.5">
                  {['Morning', 'Midday', 'Wind Down', 'Bedtime'].map((mod, i) => {
                    const done = [journalData?.morning_prime_done, journalData?.midday_reset_done, journalData?.wind_down_done, journalData?.bedtime_story_done][i]
                    return (
                      <div key={mod} className="flex items-center gap-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${done ? 'bg-white' : 'bg-white/30'}`} />
                        <span className={`text-[11px] ${done ? 'text-white' : 'text-white/85'}`}>{mod}</span>
                      </div>
                    )
                  })}
                </div>
                <span className="text-xs text-white/90 font-medium">{modulesCompletedToday}/4</span>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2">
                <p className="text-sm text-white/90">Tap to open your guide</p>
                <ChevronRight className="w-5 h-5 text-white/90" />
              </div>
            </div>
          </button>,
        ]

        // Slide 2: Daily Wellness
        slides.push(
          <WellnessWidget
            key="wellness"
            journalMood={journalMood}
            streak={streak}
            modulesCompletedToday={modulesCompletedToday}
            hasJournaledToday={hasJournaledToday}
          />
        )

        // Slide 3: Daily Feature Tip
        slides.push(<DailyFeatureTip key="feature-tip" />)

        return <HeroCarousel>{slides}</HeroCarousel>
      })()}


      {/* Smart Nudge — shows after 30s idle when not playing audio */}
      <SmartHomeNudge
        isAudioActive={audioState.homeAudioActive}
        journalMood={journalMood}
        hasJournaledToday={hasJournaledToday}
        streak={streak}
        modulesCompletedToday={modulesCompletedToday}
        hasDailyIntention={!!dailyIntention}
      />

      {/* Adaptive-ordered sections (#2) */}
      {sectionOrder.map((section, orderIdx) => {
        switch (section) {
          case 'soundscapes':
            return (
              <div key="soundscapes" className="stagger-item" style={{ '--i': orderIdx } as React.CSSProperties}>
                <SoundscapesSection
                  activeSoundscape={audioState.activeSoundscape}
                  soundscapeIsPlaying={audioState.soundscapeIsPlaying}
                  isContentFree={(type, id) => isContentFree(type, id)}
                  onPlay={handleSoundscapePlay}
                  onReopen={handleSoundscapeReopen}
                  onOpenMixer={() => setShowMixer(true)}
                />
              </div>
            )
          case 'guided':
            return (
              <div key="guided" className="stagger-item" style={{ '--i': orderIdx } as React.CSSProperties}>
                <GuidedSection
                  guideLabel={audioState.guideLabel}
                  guideIsPlaying={audioState.guideIsPlaying}
                  loadingGuide={audioState.loadingGuide}
                  isContentFree={(type, id) => isContentFree(type, id)}
                  onPlay={handleGuidePlay}
                  audioElement={guideAudioElement}
                />
              </div>
            )
          case 'motivation':
            return (
              <React.Fragment key="motivation">
                <div className="stagger-item" style={{ '--i': orderIdx } as React.CSSProperties}>
                  <MotivationSection
                    videos={featuredMotivationVideos}
                    loading={loadingMotivation}
                    topicName={moodTopic ? 'For You' : featuredTopic}
                    tagline={moodTopic ? `Based on your mood \u00b7 ${featuredTopic}` : undefined}
                    heroCard={true}
                    backgrounds={backgrounds}
                    activeCardId={audioState.activeCardId}
                    tappedCardId={audioState.tappedCardId}
                    musicPlaying={audioState.musicPlaying}
                    isContentFree={(type, index) => isContentFree(type, index)}
                    onPlay={(video, index, isLocked) => handleMotivationPlay(video, index, isLocked, featuredTopic)}
                    onMagneticMove={magneticMove}
                    onMagneticLeave={magneticLeave}
                    onRipple={spawnRipple}
                    onShuffle={() => handleShuffleTopic(featuredTopic)}
                    shuffling={shufflingTopic === featuredTopic}
                    favoriteIds={favoriteIds}
                    onToggleFavorite={handleToggleFavorite}
                    progressPercent={audioState.currentPlaylist?.type === 'motivation' && audioState.musicDuration > 0
                      ? (audioState.musicCurrentTime / audioState.musicDuration) * 100
                      : undefined}
                    onLongPressStart={handleLongPressStart}
                    onLongPressEnd={handleLongPressEnd}
                  />
                </div>

                {/* Your Saves */}
                {savedMotivationVideos.length > 0 && (
                  <SavedMotivationSection
                    videos={savedMotivationVideos}
                    backgrounds={backgrounds}
                    activeCardId={audioState.activeCardId}
                    tappedCardId={audioState.tappedCardId}
                    musicPlaying={audioState.musicPlaying}
                    onPlay={(video, index) => handlePlayMotivation(video, index)}
                    onRemoveFavorite={handleToggleFavorite}
                    onMagneticMove={magneticMove}
                    onMagneticLeave={magneticLeave}
                    onRipple={spawnRipple}
                  />
                )}

                {/* Daily Intention — "What's your focus today?" */}
                <DailyIntentionCard dailyIntention={dailyIntention} today={today} />
              </React.Fragment>
            )
          case 'music':
            return (
              <React.Fragment key="music">
                <div className="stagger-item" style={{ '--i': orderIdx } as React.CSSProperties}>
                  <MusicTabsSection
                    genres={MUSIC_GENRES}
                    currentPlayingGenreId={audioState.currentPlaylist?.type === 'music' ? audioState.currentPlaylist.genreId : undefined}
                    fallbackBackgrounds={backgrounds}
                    audioState={audioState}
                    isContentFree={(type, index) => isContentFree(type, index)}
                    onPlay={handleMusicGenrePlay}
                    onMagneticMove={magneticMove}
                    onMagneticLeave={magneticLeave}
                    onRipple={spawnRipple}
                    favoriteIds={musicFavoriteIds}
                    onToggleFavorite={handleToggleMusicFavorite}
                    onLongPressStart={handleLongPressStart}
                    onLongPressEnd={handleLongPressEnd}
                    showShuffleToast={showShuffleToast}
                    onDataLoaded={handleGenreDataLoaded}
                  />
                </div>

                {/* Saved Music */}
                {savedMusicVideos.length > 0 && (
                  <SavedMotivationSection
                    label="Saved Music"
                    subtitle="Tracks you loved"
                    videos={savedMusicVideos}
                    backgrounds={backgrounds}
                    activeCardId={audioState.activeCardId}
                    tappedCardId={audioState.tappedCardId}
                    musicPlaying={audioState.musicPlaying}
                    onPlay={(video, index) => handlePlayMusic(video, index, '', 'Saved Music')}
                    onRemoveFavorite={handleToggleMusicFavorite}
                    onMagneticMove={magneticMove}
                    onMagneticLeave={magneticLeave}
                    onRipple={spawnRipple}
                  />
                )}
              </React.Fragment>
            )
          case 'wisdom':
            return (
              <div key="wisdom" className="stagger-item" style={{ '--i': orderIdx } as React.CSSProperties}>
                <WisdomSection />
              </div>
            )
          default:
            return null
        }
      })}

      {/* Daily Spark */}
      {!showMorningFlow && <DailySpark />}

      {/* Floating AI Coach Button + Greeting Bubble */}
      <div className="fixed right-5 bottom-28 z-30 flex items-center gap-2">
        <CoachGreetingBubble mindsetId={mindsetCtx?.mindset} onVisibleChange={setIsCoachNudging} />
        <Link href="/coach" aria-label="Open AI coach" className="transition-all press-scale">
          <CoachAvatar mindsetId={mindsetCtx?.mindset} size="lg" nudging={isCoachNudging} plain className="!w-20 !h-20" />
        </Link>
      </div>

      {/* Ambient Mixer */}
      {showMixer && <AmbientMixer onClose={() => setShowMixer(false)} />}

      {/* Preview Timer */}
      {isPreviewActive && <PreviewTimer secondsLeft={secondsLeft} />}

      {/* Preview Paywall Modal */}
      <PreviewPaywall
        isOpen={showPaywall}
        onClose={() => {
          setShowPaywall(false)
          stopPreview()
          // Stop playback and close player — preview ended without unlock
          if (bgPlayerRef.current && bgPlayerReadyRef.current) {
            try { bgPlayerRef.current.stopVideo() } catch {}
          }
          dispatch({ type: 'CLOSE_PLAYER' })
        }}
        contentName={paywallContentName}
        showDailyUnlock={!dailyFreeUnlockUsed}
        onUseDailyUnlock={() => {
          useDailyFreeUnlock()
          stopPreview()
          if (previewUnlockCallback) {
            previewUnlockCallback()
            setPreviewUnlockCallback(null)
          }
        }}
      />

      {/* Audio Visualizer — decorative bars above the player bar */}
      {(audioState.musicPlaying || audioState.soundscapeIsPlaying) && (
        <div className="fixed bottom-[68px] left-0 right-0 z-30 flex justify-center pointer-events-none">
          <AudioVisualizer isPlaying={audioState.musicPlaying || audioState.soundscapeIsPlaying} barCount={24} height={32} className="opacity-40" />
        </div>
      )}

      {/* Bottom Player Bar */}
      <BottomPlayerBar
        mode={activeMode}
        isPlaying={
          audioState.backgroundMusic ? audioState.musicPlaying :
          audioState.guideLabel ? audioState.guideIsPlaying :
          audioState.activeSoundscape ? audioState.soundscapeIsPlaying :
          isPlaying
        }
        onTogglePlay={() => debouncedToggle(() => {
          if (audioState.backgroundMusic) {
            if (audioState.musicPlaying) {
              dispatch({ type: 'PAUSE_MUSIC' })
            } else {
              dispatch({ type: 'RESUME_MUSIC' })
              if (!currentBgVideoIdRef.current && audioState.backgroundMusic.youtubeId) {
                createBgMusicPlayer(audioState.backgroundMusic.youtubeId, restoreStartSecondsRef.current || undefined)
                restoreStartSecondsRef.current = 0
              }
            }
          } else if (audioState.guideLabel) {
            toggleGuidePlay()
          } else if (audioState.activeSoundscape) {
            if (audioState.soundscapeIsPlaying) {
              dispatch({ type: 'PAUSE_SOUNDSCAPE' })
            } else {
              dispatch({ type: 'RESUME_SOUNDSCAPE' })
              if (!currentScVideoIdRef.current && audioState.activeSoundscape.youtubeId) {
                createSoundscapePlayer(audioState.activeSoundscape.youtubeId)
              }
            }
          } else {
            // Don't default to soundscape if restore is still pending or session is active
            if (audioContext?.isSessionActive || isRestorePendingRef.current) return
            const item = SOUNDSCAPE_ITEMS.find(i => i.id === activeMode) || SOUNDSCAPE_ITEMS[0]
            dispatch({ type: 'PLAY_SOUNDSCAPE', soundscape: { soundId: item.id, label: item.label, subtitle: item.subtitle, youtubeId: item.youtubeId } })
            createSoundscapePlayer(item.youtubeId)
          }
        })}
        onOpenPlayer={() => {
          if (audioState.backgroundMusic && audioState.currentPlaylist) {
            const pl = audioState.currentPlaylist
            const currentVideo = pl.videos[pl.index]
            if (currentVideo) {
              let bg: string | undefined
              if (pl.type === 'motivation') {
                const bgs = getTodaysBackgrounds()
                bg = bgs[pl.index % bgs.length]
              } else {
                const gid = pl.genreId || ''
                const gBgs = genreBackgrounds[gid]?.length > 0 ? genreBackgrounds[gid] : getGenreBackgrounds(gid)
                bg = gBgs.length > 0 ? gBgs[pl.index % gBgs.length] : backgrounds[(pl.index + 15) % backgrounds.length]
              }
              dispatch({
                type: 'OPEN_FULLSCREEN_PLAYER',
                playingSound: { word: audioState.backgroundMusic.label, color: 'from-white/[0.06] to-white/[0.02]', youtubeId: currentVideo.youtubeId, backgroundImage: bg },
              })
            }
            return
          }
          if (audioState.guideLabel) { setShowGuidedPlayer(true); return }
          if (audioState.activeSoundscape) {
            dispatch({ type: 'SHOW_SOUNDSCAPE_PLAYER' })
          } else {
            // Don't default to soundscape if restore is still pending or session is active
            if (audioContext?.isSessionActive || isRestorePendingRef.current) return
            const item = SOUNDSCAPE_ITEMS.find(i => i.id === activeMode) || SOUNDSCAPE_ITEMS[0]
            dispatch({ type: 'PLAY_SOUNDSCAPE', soundscape: { soundId: item.id, label: item.label, subtitle: item.subtitle, youtubeId: item.youtubeId } })
            createSoundscapePlayer(item.youtubeId)
          }
        }}
        label={audioState.backgroundMusic?.label || audioState.guideLabel || audioState.activeSoundscape?.label || undefined}
        nextTrackTitle={
          audioState.currentPlaylist && audioState.currentPlaylist.index < audioState.currentPlaylist.videos.length - 1
            ? audioState.currentPlaylist.videos[audioState.currentPlaylist.index + 1]?.title
            : undefined
        }
        playlistPosition={
          audioState.currentPlaylist
            ? `${audioState.currentPlaylist.index + 1} of ${audioState.currentPlaylist.videos.length}`
            : undefined
        }
        audioElement={audioState.guideLabel ? guideAudioElement : null}
      />


    </div>
    </div>
  )
}
