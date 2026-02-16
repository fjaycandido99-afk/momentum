'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Settings, PenLine, Home, Save, ChevronDown, ChevronRight, Sun, Sunrise, Moon, Sparkles, Bot, BarChart3, Compass, Play, Music } from 'lucide-react'
import { SpiralLogo } from './SpiralLogo'
import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'
import { useHomeAudio } from '@/contexts/HomeAudioContext'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'
import { StreakBadge } from '@/components/daily-guide/StreakDisplay'
import { BottomPlayerBar } from './BottomPlayerBar'
import { DailySpark } from './DailySpark'
import { SoundscapesSection } from './SoundscapesSection'
import { GuidedSection } from './GuidedSection'
import { XPBadge } from './XPBadge'
import { MotivationSection } from './MotivationSection'
import { LazyGenreSection } from './LazyGenreSection'
import { JournalNudgeCard } from './JournalNudgeCard'
import { PathChallengeBanner } from './PathChallengeBanner'
import { AIMeditationPlayer } from './AIMeditationPlayer'
import { ContinueListeningCard } from './ContinueListeningCard'
import { WelcomeBackCard } from './WelcomeBackCard'
import { HeroCarousel } from './HeroCarousel'
import { SavedMotivationSection } from './SavedMotivationSection'
import {
  Mode, VideoItem, MUSIC_GENRES,
  getTimeContext, getSuggestedMode, getTodaysTopicName, getTodaysBackgrounds,
  getMoodTopicName,
} from './home-types'
import { useAudioOptional } from '@/contexts/AudioContext'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { FREEMIUM_LIMITS } from '@/lib/subscription-constants'
import { PreviewPaywall, PreviewTimer, usePreview, AICoachNudge, useCoachNudge } from '@/components/premium/SoftLock'
import { useScrollReveal, useParallax, useMagneticHover, useRippleBurst } from '@/hooks/useHomeAnimations'
import { useSectionTransitions } from '@/hooks/useSectionTransitions'
import { useScrollHeader } from '@/hooks/useScrollHeader'
import { useListeningMilestones } from '@/hooks/useListeningMilestones'
import { LongPressPreview } from './LongPressPreview'
import { WellnessWidget } from './WellnessWidget'
import { ResumeGuideCard } from './ResumeGuideCard'
import { SmartHomeNudge } from './SmartHomeNudge'
import { PathContentSection } from './PathContentSection'
import { DailyIntentionCard } from './DailyIntentionCard'
import { DailyProgressRing } from './DailyProgressRing'
import { SocialProofBanner } from './SocialProofBanner'
import { TomorrowPreview } from './TomorrowPreview'
import { StreakFreezeIndicator } from './StreakFreezeIndicator'
import { useToast } from '@/contexts/ToastContext'
import { usePreferences, useJournalMood, useMotivationVideos, useFavorites, useWelcomeStatus, useGamificationStatus } from '@/hooks/useHomeSWR'
import { useListeningStats, checkAudioAchievements } from '@/hooks/useListeningStats'
import { getAdaptiveSectionOrder, type FeedSection } from '@/lib/smart-home-feed'
import { useAchievementOptional } from '@/contexts/AchievementContext'
import { ACHIEVEMENTS } from '@/lib/achievements'

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
  if (hour >= 5 && hour < 12) return { subtitle: 'Start your morning flow', Icon: Sunrise }
  if (hour >= 12 && hour < 17) return { subtitle: 'Midday check-in ready', Icon: Sun }
  if (hour >= 17 && hour < 22) return { subtitle: 'Wind down with Day Close', Icon: Moon }
  return { subtitle: 'Evening reflection & sleep', Icon: Moon }
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
  const { bgPlayerRef, bgPlayerReadyRef, soundscapePlayerRef, soundscapeReadyRef, bgProgressIntervalRef, currentBgVideoIdRef, currentScVideoIdRef, keepaliveRef, wakeLockRef, guideAudioRef, autoSkipNextRef } = homeAudioRefs

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

  // Preview paywall state
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallContentName, setPaywallContentName] = useState('')
  const [previewUnlockCallback, setPreviewUnlockCallback] = useState<(() => void) | null>(null)

  // Preview timer hook
  const handlePreviewEnd = useCallback(() => {
    if (bgPlayerRef.current && bgPlayerReadyRef.current) {
      try { bgPlayerRef.current.pauseVideo() } catch {}
    }
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.pauseVideo() } catch {}
    }
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
    }
    setShowPaywall(true)
  }, [])

  const { isPreviewActive, secondsLeft, startPreview, stopPreview } = usePreview({
    onPreviewEnd: handlePreviewEnd,
    previewDuration: FREEMIUM_LIMITS.previewSeconds,
  })

  // AI Coach nudge
  const { showNudge, dismissNudge } = useCoachNudge(
    isPremium ? Infinity : FREEMIUM_LIMITS.coachNudgeDelayMs
  )


  // Hamburger menu
  const [showMenu, setShowMenu] = useState(false)

  // Overlays
  const [showMorningFlow, setShowMorningFlow] = useState(false)
  const [aiMeditationTheme, setAiMeditationTheme] = useState<string | null>(null)

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
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    const thisRequest = ++guideRequestId.current

    if (isPlaying) setIsPlaying(false)
    // Stop soundscape imperative
    if (soundscapePlayerRef.current && soundscapeReadyRef.current) {
      try { soundscapePlayerRef.current.stopVideo() } catch {}
    }
    currentScVideoIdRef.current = null

    dispatch({ type: 'PLAY_GUIDE', guideId, guideName })

    try {
      const typeMap: Record<string, string> = { anxiety: 'grounding' }
      const mappedType = typeMap[guideId] || guideId

      const response = await fetch('/api/daily-guide/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mappedType }),
      })
      const data = await response.json()

      if (guideRequestId.current !== thisRequest) return

      if (data.audioBase64) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioBase64}`
        const audio = new Audio(audioUrl)
        guideAudioRef.current = audio

        audio.oncanplaythrough = () => {
          if (guideRequestId.current !== thisRequest) {
            audio.pause(); audio.src = ''; return
          }
          audio.play()
            .then(() => dispatch({ type: 'GUIDE_PLAY_STARTED' }))
            .catch(err => console.error('Guide play error:', err))
        }
        audio.onended = () => dispatch({ type: 'GUIDE_ENDED' })
        audio.onerror = () => dispatch({ type: 'GUIDE_ERROR' })
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
    const audio = guideAudioRef.current
    if (!audio) return
    if (audioState.guideIsPlaying) {
      audio.pause()
      dispatch({ type: 'PAUSE_GUIDE' })
    } else {
      audio.play().then(() => dispatch({ type: 'RESUME_GUIDE' }))
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

  const touchStartY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const PULL_THRESHOLD = 100

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (showMorningFlow) return
    const el = scrollRef.current
    if (el && el.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [showMorningFlow])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || showMorningFlow) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setPullDistance(Math.min(delta * 0.5, 150))
  }, [isPulling, showMorningFlow])

  const handleTouchEnd = useCallback(() => {
    if (showMorningFlow) return
    if (pullDistance >= PULL_THRESHOLD) {
      stopBackgroundMusic()
      setShowMorningFlow(true)
    }
    setPullDistance(0)
    setIsPulling(false)
  }, [pullDistance, showMorningFlow, stopBackgroundMusic])

  // --- Data fetching (SWR) ---
  const topicName = getTodaysTopicName()
  const [backgrounds] = useState(getTodaysBackgrounds)
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  // SWR: Preferences
  const { streak, mutatePreferences } = usePreferences()

  // SWR: Journal mood
  const { journalData, journalMood, journalLoading, moodBefore, energyLevel, hasJournaledToday, modulesCompletedToday, dailyIntention } = useJournalMood(today)

  // SWR: Gamification status (for bonus, freezes)
  const { dailyBonusClaimed, streakFreezes, freezeUsedToday, lastStreakLost } = useGamificationStatus()

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

  useEffect(() => {
    if (hasRestoredRef.current) return
    const lastPlayed = audioContext?.lastPlayed
    if (!lastPlayed) {
      isRestorePendingRef.current = false
      return
    }
    if (audioContext?.isSessionActive) return
    hasRestoredRef.current = true

    if (lastPlayed.type === 'music' && lastPlayed.genreId && lastPlayed.videoId) {
      const genre = MUSIC_GENRES.find(g => g.id === lastPlayed.genreId)
      if (genre) {
        dispatch({
          type: 'RESTORE_LAST_PLAYED',
          partial: {
            backgroundMusic: { youtubeId: lastPlayed.videoId, label: lastPlayed.genreWord || genre.word },
            musicPlaying: false,
            userPausedMusic: true,
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

  // --- Card tap animation ---
  const triggerTap = (videoId: string) => {
    dispatch({ type: 'TAP_CARD', videoId })
    setTimeout(() => dispatch({ type: 'CLEAR_TAP' }), 400)
  }

  // --- Play handlers ---
  const handlePlayMotivation = (video: VideoItem, index: number, topic?: string) => {
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
    const gBgs = genreBackgrounds[genreId] || []
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
            thumbnail: video.thumbnail || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
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
            thumbnail: video.thumbnail || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
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
      const gBgs = genreBackgrounds[pl.genreId || ''] || []
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
      const gBgs = genreBackgrounds[pl.genreId || ''] || []
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
    if (isLocked) {
      stopPreview()
      setPaywallContentName(item.label)
      setPreviewUnlockCallback(() => () => {
        createSoundscapePlayer(item.youtubeId)
        dispatch({ type: 'SHOW_SOUNDSCAPE_PLAYER' })
      })
    }

    // Stop guide audio imperatively (but keep music for layering)
    if (guideAudioRef.current) {
      guideAudioRef.current.pause()
      guideAudioRef.current.src = ''
      guideAudioRef.current = null
    }
    if (isPlaying) setIsPlaying(false)

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
      className={`relative min-h-screen text-white pb-28 ${showMorningFlow || audioState.playingSound || audioState.showSoundscapePlayer ? 'overflow-hidden max-h-screen' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
          showRain={false}
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
              className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 backdrop-blur-sm transition-colors"
            >
              <Home className="w-4 h-4 text-white/95" />
              <span className="text-sm text-white/95">Home</span>
            </button>
          </div>
        </div>
      )}

      {/* Pull-down indicator */}
      <div
        className="flex flex-col items-center justify-end overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px', opacity: pullDistance > 0 ? 1 : 0 }}
      >
        <div className="flex flex-col items-center gap-1 pb-2">
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-300 ${
              pullDistance >= PULL_THRESHOLD ? 'text-white rotate-180 scale-110' : 'text-white/95'
            }`}
            style={{ transform: pullDistance > 0 && pullDistance < PULL_THRESHOLD ? `rotate(${(pullDistance / PULL_THRESHOLD) * 180}deg)` : undefined }}
          />
          <span className={`text-xs transition-all duration-200 ${pullDistance >= PULL_THRESHOLD ? 'text-white font-medium' : 'text-white/95'}`}>
            {pullDistance >= PULL_THRESHOLD ? 'Release for Daily Guide' : 'Pull down for Daily Guide'}
          </span>
        </div>
      </div>

      {/* Header — hidden when any fullscreen overlay is active */}
      {!showMorningFlow && !audioState.playingSound && !audioState.showSoundscapePlayer && (
        <div className="sticky top-0 z-50 flex items-center justify-between px-5 pt-12 pb-2 animate-fade-in-down bg-black before:absolute before:content-[''] before:-top-20 before:left-0 before:right-0 before:h-20 before:bg-black"
        >
          {/* Bottom blur fade */}
          <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
          <div className="flex items-center gap-2 min-w-0">
            <h1 className={`font-semibold shimmer-text transition-all duration-300 shrink-0 ${headerScrolled ? 'text-lg' : 'text-xl'}`}>Explore</h1>
            <StreakBadge streak={streak} freezeCount={streakFreezes} />
            <XPBadge />
            <DailyProgressRing
              morningDone={!!journalData?.morning_prime_done}
              movementDone={!!journalData?.movement_done}
              lessonDone={!!journalData?.micro_lesson_done}
              closeDone={!!journalData?.day_close_done}
              hasJournaledToday={hasJournaledToday}
              dailyIntention={!!dailyIntention}
              dailyBonusClaimed={dailyBonusClaimed}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {mindsetCtx && (
              <div className="flex items-center justify-center px-1.5 py-1 rounded-full bg-white/[0.06]">
                <MindsetIcon mindsetId={mindsetCtx.mindset} className="w-4 h-4 text-white/60" />
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
      )}

      {/* Hamburger Menu Dropdown */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
          <div className="fixed right-6 top-[85px] z-40 w-48 py-2 rounded-2xl bg-black border border-white/15 shadow-xl animate-fade-in-up">
            <Link href="/my-path" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <Compass className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">
                {mindsetCtx?.mindset === 'stoic' ? 'Stoic Path'
                  : mindsetCtx?.mindset === 'existentialist' ? 'The Existentialist'
                  : mindsetCtx?.mindset === 'cynic' ? "Cynic's Way"
                  : mindsetCtx?.mindset === 'hedonist' ? 'Garden of Epicurus'
                  : mindsetCtx?.mindset === 'samurai' ? 'Way of the Warrior'
                  : 'My Path'}
              </span>
            </Link>
            <Link href="/journal" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <PenLine className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">Journal</span>
            </Link>
            <Link href="/saved" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <Save className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">Saved</span>
            </Link>
            <Link href="/progress" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <BarChart3 className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">Progress</span>
            </Link>
            <div className="mx-3 my-1 border-t border-white/10" />
            <Link href="/settings" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <Settings className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90">Settings</span>
            </Link>
          </div>
        </>
      )}

      {/* Welcome Back Card */}
      {showWelcomeBack && shouldShowWelcome && (
        <WelcomeBackCard
          daysAway={welcomeDaysAway}
          lastStreak={welcomeLastStreak}
          onDismiss={() => setShowWelcomeBack(false)}
        />
      )}

      {/* Streak Freeze Indicator */}
      <StreakFreezeIndicator
        freezeCount={streakFreezes}
        freezeUsedToday={freezeUsedToday}
        streakLost={lastStreakLost}
      />

      {/* Daily Intention Card */}
      <DailyIntentionCard dailyIntention={dailyIntention} today={today} />

      {/* Hero Carousel: Daily Guide + Path + Featured */}
      {(() => {
        const slides: React.ReactNode[] = [
          // Slide 1: Daily Guide
          <button
            key="guide"
            onClick={() => { stopBackgroundMusic(); setShowMorningFlow(true) }}
            className="w-full h-full text-left group"
          >
            <div className="relative p-5 rounded-2xl border border-white/[0.15] press-scale bg-black h-full flex flex-col justify-between overflow-hidden">
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
                  {['Morning', 'Close', 'Move', 'Learn'].map((mod, i) => {
                    const done = [journalData?.morning_prime_done, journalData?.day_close_done, journalData?.movement_done, journalData?.micro_lesson_done][i]
                    return (
                      <div key={mod} className="flex items-center gap-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${done ? 'bg-white' : 'bg-white/30'}`} />
                        <span className={`text-[11px] ${done ? 'text-white' : 'text-white/70'}`}>{mod}</span>
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

        // Slide 2: Path Challenge
        if (mindsetCtx) {
          slides.push(
            <PathChallengeBanner
              key="path"
              mindsetId={mindsetCtx.mindset}
              embedded
            />
          )
        }

        // Slide 3: Daily Wellness
        slides.push(
          <WellnessWidget
            key="wellness"
            journalMood={journalMood}
            streak={streak}
            modulesCompletedToday={modulesCompletedToday}
            hasJournaledToday={hasJournaledToday}
          />
        )

        // Slide 4: Featured Motivation
        {
          const video = motivationVideos[0]
          if (video) {
            const bg = backgrounds[0]
            slides.push(
              <button
                key="feat-motiv"
                onClick={() => handlePlayMotivation(video, 0)}
                className="relative w-full text-left rounded-2xl overflow-hidden border border-white/[0.08] group press-scale h-full"
              >
                {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
                <div className="relative z-10 p-5 flex flex-col justify-between h-full">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-500/20 backdrop-blur-sm">
                      <Sparkles className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Featured Motivation</p>
                      <p className="text-xs text-white/60">{featuredTopic}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-white line-clamp-2 mb-2">{video.title}</p>
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <Play className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                      <span>Tap to play</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          }
        }

        // Slide 4: Featured Music
        {
          const firstGenre = MUSIC_GENRES[0]
          const musicVids = genreVideos[firstGenre.id]
          const musicVideo = musicVids?.[0]
          if (musicVideo) {
            const gBgs = genreBackgrounds[firstGenre.id] || []
            const bg = gBgs[0] || backgrounds[2]
            slides.push(
              <button
                key="feat-music"
                onClick={() => handlePlayMusic(musicVideo, 0, firstGenre.id, firstGenre.word)}
                className="relative w-full text-left rounded-2xl overflow-hidden border border-white/[0.08] group press-scale h-full"
              >
                {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
                <div className="relative z-10 p-5 flex flex-col justify-between h-full">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/20 backdrop-blur-sm">
                      <Music className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Featured Music</p>
                      <p className="text-xs text-white/60">{firstGenre.word}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-white line-clamp-2 mb-2">{musicVideo.title}</p>
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                      <span>Tap to play</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          }
        }

        return <HeroCarousel>{slides}</HeroCarousel>
      })()}


      {/* Social Proof Banner */}
      <SocialProofBanner />

      {/* Resume Daily Guide (#9 — Session Continuity) */}
      <ResumeGuideCard
        modulesCompleted={modulesCompletedToday}
        totalModules={4}
        onResume={() => { stopBackgroundMusic(); setShowMorningFlow(true) }}
      />

      {/* Journal Nudge — hidden when intention is set (intention card already links to journal) */}
      {!dailyIntention && (
        <div className="px-6 mb-6">
          <JournalNudgeCard journalData={journalData} journalLoading={journalLoading} />
        </div>
      )}

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
                  onPlayAIMeditation={(themeId) => isPremium ? setAiMeditationTheme(themeId) : openUpgradeModal()}
                  isPremium={isPremium}
                />
              </div>
            )
          case 'motivation':
            return (
              <React.Fragment key="motivation">
                {/* Continue Listening (when paused mid-motivation) */}
                {audioState.backgroundMusic && !audioState.musicPlaying && audioState.userPausedMusic
                  && audioState.currentPlaylist?.type === 'motivation' && audioState.musicCurrentTime > 0 && (
                  <ContinueListeningCard
                    video={audioState.currentPlaylist.videos[audioState.currentPlaylist.index] || { id: '', title: audioState.backgroundMusic.label, youtubeId: audioState.backgroundMusic.youtubeId, channel: '' }}
                    currentTime={audioState.musicCurrentTime}
                    duration={audioState.musicDuration}
                    background={backgrounds[audioState.currentPlaylist.index % backgrounds.length]}
                    onResume={() => dispatch({ type: 'RESUME_MUSIC' })}
                    onOpenPlayer={() => {
                      const pl = audioState.currentPlaylist!
                      const currentVideo = pl.videos[pl.index]
                      if (currentVideo) {
                        const bgs = getTodaysBackgrounds()
                        dispatch({
                          type: 'OPEN_FULLSCREEN_PLAYER',
                          playingSound: { word: audioState.backgroundMusic!.label, color: 'from-white/[0.06] to-white/[0.02]', youtubeId: currentVideo.youtubeId, backgroundImage: bgs[pl.index % bgs.length] },
                        })
                      }
                    }}
                  />
                )}

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
              </React.Fragment>
            )
          case 'path':
            return mindsetCtx ? (
              <PathContentSection
                key="path"
                mindsetId={mindsetCtx.mindset}
                motivationByTopic={motivationByTopic}
                backgrounds={backgrounds}
                activeCardId={audioState.activeCardId}
                tappedCardId={audioState.tappedCardId}
                musicPlaying={audioState.musicPlaying}
                onPlay={(video, index, topic) => handleMotivationPlay(video, index, false, topic)}
                onMagneticMove={magneticMove}
                onMagneticLeave={magneticLeave}
                onRipple={spawnRipple}
              />
            ) : null
          case 'music':
            return (
              <React.Fragment key="music">
                {MUSIC_GENRES.map((g, gi) => (
                  <div key={g.id} className="stagger-item" style={{ '--i': orderIdx + gi } as React.CSSProperties}>
                    <LazyGenreSection
                      genre={g}
                      genreIndex={gi}
                      fallbackBackgrounds={backgrounds}
                      activeCardId={audioState.activeCardId}
                      tappedCardId={audioState.tappedCardId}
                      musicPlaying={audioState.musicPlaying}
                      isContentFree={(type, index) => isContentFree(type, index)}
                      onPlay={handleMusicGenrePlay}
                      onMagneticMove={magneticMove}
                      onMagneticLeave={magneticLeave}
                      onRipple={spawnRipple}
                      heroCard={true}
                      favoriteIds={musicFavoriteIds}
                      onToggleFavorite={handleToggleMusicFavorite}
                      progressPercent={audioState.currentPlaylist?.type === 'music' && audioState.currentPlaylist?.genreId === g.id && audioState.musicDuration > 0
                        ? (audioState.musicCurrentTime / audioState.musicDuration) * 100
                        : undefined}
                      onLongPressStart={handleLongPressStart}
                      onLongPressEnd={handleLongPressEnd}
                      showShuffleToast={showShuffleToast}
                      onDataLoaded={handleGenreDataLoaded}
                    />
                  </div>
                ))}

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
          default:
            return null
        }
      })}

      {/* Daily Spark */}
      {!showMorningFlow && <DailySpark />}

      {/* Tomorrow Preview */}
      {!showMorningFlow && <TomorrowPreview />}

      {/* Floating AI Coach Button */}
      <Link
        href="/coach"
        className="fixed right-5 bottom-28 z-30 p-3.5 rounded-full bg-gradient-to-br from-amber-500/25 to-orange-500/25 border border-amber-500/25 hover:border-amber-500/40 shadow-lg shadow-amber-500/10 transition-all press-scale backdrop-blur-sm"
      >
        <Bot className="w-6 h-6 text-amber-400" />
      </Link>

      {/* AI Coach Nudge */}
      {!isPremium && (
        <AICoachNudge isVisible={showNudge} onDismiss={dismissNudge} />
      )}

      {/* Preview Timer */}
      {isPreviewActive && <PreviewTimer secondsLeft={secondsLeft} />}

      {/* AI Meditation Player */}
      {aiMeditationTheme && (
        <AIMeditationPlayer
          onClose={() => setAiMeditationTheme(null)}
          preselectedTheme={aiMeditationTheme}
        />
      )}

      {/* Preview Paywall Modal */}
      <PreviewPaywall
        isOpen={showPaywall}
        onClose={() => { setShowPaywall(false); stopPreview() }}
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
                createBgMusicPlayer(audioState.backgroundMusic.youtubeId)
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
                const gBgs = genreBackgrounds[pl.genreId || ''] || []
                bg = gBgs.length > 0 ? gBgs[pl.index % gBgs.length] : backgrounds[(pl.index + 15) % backgrounds.length]
              }
              dispatch({
                type: 'OPEN_FULLSCREEN_PLAYER',
                playingSound: { word: audioState.backgroundMusic.label, color: 'from-white/[0.06] to-white/[0.02]', youtubeId: currentVideo.youtubeId, backgroundImage: bg },
              })
            }
            return
          }
          if (audioState.guideLabel) return
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
      />


    </div>
    </div>
  )
}
