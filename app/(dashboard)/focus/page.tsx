'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Timer, Minus, Plus, Square, Pause, Play, ChevronUp } from 'lucide-react'
import { FocusSoundPicker } from '@/components/focus/FocusSoundPicker'
import { FocusMusicPicker, type FocusMusicChoice } from '@/components/focus/FocusMusicPicker'
import { FocusAudioControls } from '@/components/focus/FocusAudioControls'
import { FocusComplete } from '@/components/focus/FocusComplete'
import { useHomeAudioOptional } from '@/contexts/HomeAudioContext'
import { useToast } from '@/contexts/ToastContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { PreviewPaywall, PreviewTimer, usePreview } from '@/components/premium/SoftLock'
import { useFeatureTooltip } from '@/components/premium/FeatureTooltip'
import { FREEMIUM_LIMITS } from '@/lib/subscription-constants'
import { logXPEventServer } from '@/lib/gamification'
import { haptic } from '@/lib/haptics'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { TierBanner } from '@/components/premium/TierBanner'
import type { SoundscapeItem } from '@/components/player/SoundscapePlayer'

type IntervalType = 'work' | 'break'

const PRESETS = [
  { label: 'Pomodoro', minutes: 25 },
  { label: 'Deep Work', minutes: 50 },
] as const

const BREAK_DURATION = 5 * 60

export default function FocusPage() {
  // --- Setup ---
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [selectedSound, setSelectedSound] = useState<SoundscapeItem | null>(null)
  const [selectedMusic, setSelectedMusic] = useState<FocusMusicChoice | null>(null)

  // --- Timer state ---
  const [remaining, setRemaining] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [intervalType, setIntervalType] = useState<IntervalType>('work')
  const [completedWorkMinutes, setCompletedWorkMinutes] = useState(0)
  const [showComplete, setShowComplete] = useState(false)
  const [xpEarned, setXpEarned] = useState<number | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const wakeLockRef = useRef<any>(null)
  const workSecondsElapsedRef = useRef(0)
  const plannedDurationRef = useRef(0)

  const homeAudio = useHomeAudioOptional()
  const { showToast } = useToast()
  const { isContentFree, dailyFreeUnlockUsed, useDailyFreeUnlock } = useSubscription()
  const featureTooltipCtx = useFeatureTooltip()

  // Preview paywall state
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallContentName, setPaywallContentName] = useState('')
  const [previewUnlockCallback, setPreviewUnlockCallback] = useState<(() => void) | null>(null)

  // Preview timer hook
  const handlePreviewEnd = useCallback(() => {
    if (homeAudio) {
      // Pause soundscape
      if (homeAudio.audioState.soundscapeIsPlaying) {
        homeAudio.dispatch({ type: 'PAUSE_SOUNDSCAPE' })
      }
    }
    setShowPaywall(true)
  }, [homeAudio])

  const { isPreviewActive, secondsLeft, startPreview, stopPreview } = usePreview({
    onPreviewEnd: handlePreviewEnd,
    previewDuration: FREEMIUM_LIMITS.previewSeconds,
  })

  // --- Wake Lock ---
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      }
    } catch {}
  }, [])

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try { wakeLockRef.current.release() } catch {}
      wakeLockRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      releaseWakeLock()
      // Hide soundscape player overlay so home page shows feed, not the player
      if (homeAudio) homeAudio.dispatch({ type: 'HIDE_SOUNDSCAPE_PLAYER' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseWakeLock])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isRunning) requestWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isRunning, requestWakeLock])

  // --- Timer tick ---
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!isRunning) return

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          handleIntervalEnd()
          return 0
        }
        if (intervalType === 'work') workSecondsElapsedRef.current += 1
        return prev - 1
      })
    }, 1000)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, intervalType])

  const handleIntervalEnd = useCallback(() => {
    haptic('success')
    if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(intervalType === 'work' ? 'Focus session complete!' : 'Break is over!', {
        body: intervalType === 'work' ? 'Great work! Take a break.' : 'Ready to focus again?',
        icon: '/icons/icon-192.png',
      })
    }

    if (intervalType === 'work') {
      const elapsedMin = Math.round(workSecondsElapsedRef.current / 60)
      setCompletedWorkMinutes(prev => prev + elapsedMin)
      const totalElapsedMin = completedWorkMinutes + elapsedMin
      if (totalElapsedMin >= plannedDurationRef.current) {
        finishSession(totalElapsedMin)
      } else {
        setIntervalType('break')
        setTotalSeconds(BREAK_DURATION)
        setRemaining(BREAK_DURATION)
        setIsRunning(true)
        showToast({ message: 'Nice work! Take a 5-min break', type: 'success' })
      }
    } else {
      const remainingWorkMin = plannedDurationRef.current - completedWorkMinutes
      const nextWorkSeconds = Math.min(remainingWorkMin, 25) * 60
      setIntervalType('work')
      workSecondsElapsedRef.current = 0
      setTotalSeconds(nextWorkSeconds)
      setRemaining(nextWorkSeconds)
      setIsRunning(true)
      showToast({ message: 'Break over — let\'s focus!', type: 'info' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalType, completedWorkMinutes, showToast])

  const finishSession = useCallback(async (totalMinutes: number) => {
    setIsRunning(false)
    setHasStarted(false)
    releaseWakeLock()

    // Stop all audio and hide player overlays
    if (homeAudio) {
      if (homeAudio.audioState.soundscapeIsPlaying) homeAudio.dispatch({ type: 'PAUSE_SOUNDSCAPE' })
      if (homeAudio.audioState.musicPlaying) homeAudio.dispatch({ type: 'PAUSE_MUSIC' })
      if (homeAudio.audioState.guideIsPlaying && homeAudio.refs.guideAudioRef.current) {
        homeAudio.refs.guideAudioRef.current.pause()
        homeAudio.dispatch({ type: 'PAUSE_GUIDE' })
      }
      homeAudio.dispatch({ type: 'HIDE_SOUNDSCAPE_PLAYER' })
    }

    const result = await logXPEventServer('focusSession', `focus-${totalMinutes}min`)
    if (result) setXpEarned(25)
    setCompletedWorkMinutes(totalMinutes)
    setShowComplete(true)
    haptic('success')
  }, [releaseWakeLock, homeAudio])

  const handleStart = useCallback(() => {
    haptic('medium')
    plannedDurationRef.current = durationMinutes
    workSecondsElapsedRef.current = 0
    setCompletedWorkMinutes(0)
    setShowComplete(false)
    setXpEarned(null)

    const firstWorkSeconds = Math.min(durationMinutes, 25) * 60
    setTotalSeconds(firstWorkSeconds)
    setRemaining(firstWorkSeconds)
    setIntervalType('work')
    setIsRunning(true)
    setHasStarted(true)
    requestWakeLock()

    if (selectedSound && homeAudio) {
      homeAudio.dispatch({
        type: 'PLAY_SOUNDSCAPE',
        soundscape: { soundId: selectedSound.id, label: selectedSound.label, subtitle: selectedSound.subtitle, youtubeId: selectedSound.youtubeId },
        exclusive: false,
      })
      homeAudio.createSoundscapePlayer(selectedSound.youtubeId)
    }

    if (selectedMusic && homeAudio) {
      homeAudio.dispatch({
        type: 'PLAY_MUSIC',
        youtubeId: selectedMusic.youtubeId,
        label: selectedMusic.genreWord,
        cardId: `focus-${selectedMusic.genreId}`,
        playlist: null,
        playingSound: null,
        exclusive: false,
      })
      homeAudio.createBgMusicPlayer(selectedMusic.youtubeId)
    }

    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
  }, [durationMinutes, selectedSound, selectedMusic, homeAudio, requestWakeLock])

  const handlePauseResume = useCallback(() => {
    haptic('light')
    setIsRunning(prev => !prev)
    if (isRunning) {
      releaseWakeLock()
      if (homeAudio?.audioState.soundscapeIsPlaying) homeAudio.dispatch({ type: 'PAUSE_SOUNDSCAPE' })
      if (homeAudio?.audioState.musicPlaying) homeAudio.dispatch({ type: 'PAUSE_MUSIC' })
    } else {
      requestWakeLock()
      if (homeAudio?.audioState.activeSoundscape && !homeAudio.audioState.soundscapeIsPlaying) homeAudio.dispatch({ type: 'RESUME_SOUNDSCAPE' })
      if (homeAudio?.audioState.backgroundMusic && !homeAudio.audioState.musicPlaying) homeAudio.dispatch({ type: 'RESUME_MUSIC' })
    }
  }, [isRunning, homeAudio, releaseWakeLock, requestWakeLock])

  const handleToggleSoundscape = useCallback(() => {
    if (!homeAudio) return
    if (homeAudio.audioState.soundscapeIsPlaying) homeAudio.dispatch({ type: 'PAUSE_SOUNDSCAPE' })
    else if (homeAudio.audioState.activeSoundscape) homeAudio.dispatch({ type: 'RESUME_SOUNDSCAPE' })
  }, [homeAudio])

  const handleToggleMusic = useCallback(() => {
    if (!homeAudio) return
    if (homeAudio.audioState.musicPlaying) homeAudio.dispatch({ type: 'PAUSE_MUSIC' })
    else if (homeAudio.audioState.backgroundMusic) homeAudio.dispatch({ type: 'RESUME_MUSIC' })
  }, [homeAudio])

  const handleChangeSoundscape = useCallback((sound: SoundscapeItem | null, isLocked: boolean) => {
    haptic('light')
    if (isLocked && sound) {
      // Show educational tooltip first (once per session), then proceed
      if (featureTooltipCtx?.showFeatureTooltip('all_content')) return
      stopPreview()
      setPaywallContentName(sound.label)
      setPreviewUnlockCallback(() => () => {
        setSelectedSound(sound)
        if (homeAudio) {
          homeAudio.dispatch({ type: 'PLAY_SOUNDSCAPE', soundscape: { soundId: sound.id, label: sound.label, subtitle: sound.subtitle, youtubeId: sound.youtubeId }, exclusive: false })
          homeAudio.createSoundscapePlayer(sound.youtubeId)
        }
      })
    }

    setSelectedSound(sound)
    if (!homeAudio) return
    if (sound) {
      homeAudio.dispatch({ type: 'PLAY_SOUNDSCAPE', soundscape: { soundId: sound.id, label: sound.label, subtitle: sound.subtitle, youtubeId: sound.youtubeId }, exclusive: false })
      homeAudio.createSoundscapePlayer(sound.youtubeId)
    } else {
      homeAudio.dispatch({ type: 'PAUSE_SOUNDSCAPE' })
    }

    if (isLocked) startPreview()
  }, [homeAudio, featureTooltipCtx, stopPreview, startPreview])

  const handleChangeMusic = useCallback((music: FocusMusicChoice | null) => {
    setSelectedMusic(music)
    if (!homeAudio) return
    if (music) {
      homeAudio.dispatch({ type: 'PLAY_MUSIC', youtubeId: music.youtubeId, label: music.genreWord, cardId: `focus-${music.genreId}`, playlist: null, playingSound: null, exclusive: false })
      homeAudio.createBgMusicPlayer(music.youtubeId)
    } else {
      homeAudio.dispatch({ type: 'PAUSE_MUSIC' })
    }
  }, [homeAudio])

  const handleEndEarly = useCallback(() => {
    haptic('light')
    if (intervalRef.current) clearInterval(intervalRef.current)
    const elapsedMin = Math.max(1, Math.round((completedWorkMinutes * 60 + workSecondsElapsedRef.current) / 60))
    finishSession(elapsedMin)
  }, [completedWorkMinutes, finishSession])

  const handleSkipBreak = useCallback(() => {
    haptic('light')
    if (intervalRef.current) clearInterval(intervalRef.current)
    const remainingWorkMin = plannedDurationRef.current - completedWorkMinutes
    if (remainingWorkMin <= 0) { finishSession(completedWorkMinutes); return }
    const nextWorkSeconds = Math.min(remainingWorkMin, 25) * 60
    setIntervalType('work')
    workSecondsElapsedRef.current = 0
    setTotalSeconds(nextWorkSeconds)
    setRemaining(nextWorkSeconds)
    setIsRunning(true)
  }, [completedWorkMinutes, finishSession])

  const handleStartAnother = useCallback(() => {
    setShowComplete(false)
    setXpEarned(null)
    setCompletedWorkMinutes(0)
    workSecondsElapsedRef.current = 0
  }, [])

  const adjustDuration = (delta: number) => {
    setDurationMinutes(prev => Math.min(120, Math.max(5, prev + delta)))
  }

  const [timerExpanded, setTimerExpanded] = useState(true)

  // Auto-expand when session starts
  useEffect(() => {
    if (hasStarted) setTimerExpanded(true)
  }, [hasStarted])

  // Timer display values
  const timerMinutes = Math.floor(remaining / 60)
  const timerSeconds = remaining % 60
  const timerStr = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`
  const progress = totalSeconds > 0 ? 1 - remaining / totalSeconds : 0

  // SVG ring params
  const ringSize = 240
  const ringStroke = 6
  const ringRadius = (ringSize - ringStroke) / 2
  const circumference = 2 * Math.PI * ringRadius
  const dashOffset = circumference * (1 - progress)
  const ringColor = intervalType === 'break' ? '#34d399' : '#60a5fa'
  const ringGlow = intervalType === 'break' ? 'drop-shadow(0 0 12px rgba(52,211,153,0.4))' : 'drop-shadow(0 0 12px rgba(96,165,250,0.4))'

  return (
    <div className="min-h-screen text-white pb-[calc(env(safe-area-inset-bottom)+6rem)]">
      {/* Header */}
      <div className="sticky top-0 z-40 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-4 bg-black">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-white/70" />
          <h1 className="text-2xl font-semibold shimmer-text">Focus</h1>
        </div>
        {!hasStarted && <FeatureHint id="focus-intro" text="Set a timer, pick a sound, and get to work" mode="once" />}
      </div>

      <TierBanner page="focus" />

      {/* Complete overlay */}
      {showComplete ? (
        <FocusComplete
          minutesCompleted={completedWorkMinutes}
          xpEarned={xpEarned}
          onStartAnother={handleStartAnother}
        />
      ) : (
        <div className="px-6 space-y-6 pt-2">
          {/* Duration */}
          <div>
            <p className="text-xs text-white/90 uppercase tracking-widest mb-3">Duration</p>
            <div className="flex gap-3 mb-4">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { haptic('light'); setDurationMinutes(p.minutes) }}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all press-scale ${
                    durationMinutes === p.minutes
                      ? 'bg-white text-black'
                      : 'bg-white/[0.08] border border-white/15 text-white/80 hover:bg-white/15'
                  }`}
                >
                  {p.label}
                  <span className="block text-xs mt-0.5 opacity-60">{p.minutes} min</span>
                </button>
              ))}
            </div>

            <div className="glass-refined rounded-2xl p-4 flex items-center justify-between">
              <span className="text-sm text-white/70">Custom</span>
              <div className="flex items-center gap-4">
                <button onClick={() => { haptic('light'); adjustDuration(-5) }} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors press-scale">
                  <Minus className="w-4 h-4 text-white/80" />
                </button>
                <span className="text-xl font-semibold text-white w-16 text-center tabular-nums">{durationMinutes}m</span>
                <button onClick={() => { haptic('light'); adjustDuration(5) }} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors press-scale">
                  <Plus className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>
          </div>

          {/* Sound Picker */}
          <FocusSoundPicker selectedId={selectedSound?.id ?? null} onSelect={handleChangeSoundscape} isContentFree={isContentFree} />

          {/* Music Picker */}
          <FocusMusicPicker selected={selectedMusic} onSelect={setSelectedMusic} />

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-2xl bg-white text-black text-base font-semibold transition-transform active:scale-[0.98] press-scale"
          >
            Start Focus Session
          </button>
        </div>
      )}

      {/* Timer — collapsed mini bar or expanded bottom sheet */}
      {hasStarted && !timerExpanded && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => { haptic('light'); setTimerExpanded(true) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('light'); setTimerExpanded(true) } }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-4 right-4 z-50 flex items-center justify-between px-5 py-3 rounded-2xl bg-black border border-white/10 press-scale cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <svg width={32} height={32} viewBox="0 0 32 32" className="transform -rotate-90">
                <circle cx={16} cy={16} r={13} stroke="rgba(255,255,255,0.1)" strokeWidth={2} fill="none" />
                <circle cx={16} cy={16} r={13} stroke={ringColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 13} strokeDashoffset={2 * Math.PI * 13 * (1 - progress)} />
              </svg>
            </div>
            <span className="text-sm font-medium text-white tabular-nums">{timerStr}</span>
            {intervalType === 'break' && <span className="text-xs text-emerald-400">Break</span>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); handlePauseResume() }}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
            >
              {isRunning ? (
                <Pause className="w-3.5 h-3.5 text-black" fill="black" />
              ) : (
                <Play className="w-3.5 h-3.5 text-black ml-0.5" fill="black" />
              )}
            </button>
            <ChevronUp className="w-4 h-4 text-white/40" />
          </div>
        </div>
      )}

      {hasStarted && timerExpanded && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setTimerExpanded(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <div
            className="relative w-full bg-black border-t border-white/10 rounded-t-3xl px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'sheet-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            {/* Drag handle — tap to collapse */}
            <button className="flex justify-center w-full mb-4" onClick={() => setTimerExpanded(false)}>
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </button>

            {/* Break label */}
            {intervalType === 'break' && (
              <div className="flex justify-center mb-4">
                <div className="px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  <span className="text-xs font-medium text-emerald-400 tracking-wide">Take a break</span>
                </div>
              </div>
            )}

            {/* Timer ring */}
            <div className="flex justify-center mb-6">
              <div className="relative flex items-center justify-center">
                <svg width={ringSize} height={ringSize} viewBox="0 0 240 240" className="transform -rotate-90" style={{ filter: ringGlow }}>
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} stroke="rgba(255,255,255,0.08)" strokeWidth={ringStroke} fill="none" />
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} stroke={ringColor} strokeWidth={ringStroke} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="transition-[stroke-dashoffset] duration-1000 linear" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-light text-white tracking-tight tabular-nums">{timerStr}</span>
                  {intervalType !== 'break' && (
                    <span className="text-xs text-white/40 mt-1">remaining</span>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6 mb-4">
              <button
                onClick={handleEndEarly}
                aria-label="End session"
                className="w-12 h-12 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center hover:bg-white/15 transition-colors press-scale"
              >
                <Square className="w-5 h-5 text-white/70" />
              </button>

              <button
                onClick={handlePauseResume}
                aria-label={isRunning ? 'Pause' : 'Resume'}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center transition-transform active:scale-95"
              >
                {isRunning ? (
                  <Pause className="w-7 h-7 text-black" fill="black" />
                ) : (
                  <Play className="w-7 h-7 text-black ml-0.5" fill="black" />
                )}
              </button>

              <div className="w-12 h-12" />
            </div>

            {intervalType === 'break' && (
              <div className="flex justify-center mb-3">
                <button
                  onClick={handleSkipBreak}
                  className="px-5 py-2 rounded-full bg-white/[0.08] border border-white/15 text-sm text-white/70 hover:bg-white/15 transition-colors press-scale"
                >
                  Skip break
                </button>
              </div>
            )}

            {/* Audio controls */}
            <FocusAudioControls
              selectedSound={selectedSound}
              selectedMusic={selectedMusic}
              soundscapePlaying={homeAudio?.audioState.soundscapeIsPlaying ?? false}
              musicPlaying={homeAudio?.audioState.musicPlaying ?? false}
              onToggleSoundscape={handleToggleSoundscape}
              onToggleMusic={handleToggleMusic}
              onChangeSoundscape={handleChangeSoundscape}
              onChangeMusic={handleChangeMusic}
            />

            {/* Progress */}
            <p className="text-center text-xs text-white/30 mt-3">
              {completedWorkMinutes + Math.round(workSecondsElapsedRef.current / 60)} / {plannedDurationRef.current} min
            </p>
          </div>
        </div>
      )}

      {/* Preview Timer */}
      {isPreviewActive && <PreviewTimer secondsLeft={secondsLeft} />}

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
    </div>
  )
}
