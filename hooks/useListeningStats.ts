'use client'

import { useEffect, useRef, useCallback } from 'react'
import { MIN_CONTEXT_SECONDS } from '@/lib/audio-sessions'

const STORAGE_KEY = 'voxu_listening_stats'

export interface ListeningStats {
  totalMinutes: number
  todayMinutes: number
  todayDate: string
  streakDays: number
  lastListenDate: string
  longestSession: number        // minutes
  genresPlayed: string[]        // unique genre IDs
  categoryCounts: Record<string, number> // minutes per category
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function loadStats(): ListeningStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const stats = JSON.parse(stored) as ListeningStats
      // Reset today's minutes if it's a new day
      if (stats.todayDate !== getToday()) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const wasYesterday = stats.todayDate === yesterday.toISOString().split('T')[0]

        return {
          ...stats,
          todayMinutes: 0,
          todayDate: getToday(),
          streakDays: wasYesterday && stats.todayMinutes > 0 ? stats.streakDays + 1 : (stats.todayMinutes > 0 ? 1 : stats.streakDays),
          lastListenDate: stats.todayDate,
        }
      }
      return stats
    }
  } catch {}
  return {
    totalMinutes: 0,
    todayMinutes: 0,
    todayDate: getToday(),
    streakDays: 0,
    lastListenDate: '',
    longestSession: 0,
    genresPlayed: [],
    categoryCounts: {},
  }
}

function saveStats(stats: ListeningStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch {}
}

/**
 * Tracks listening time while audio is playing.
 * Updates every 60 seconds and persists to localStorage.
 * Also tracks genres played, longest session, and listening streaks.
 */
export function useListeningStats(
  isPlaying: boolean,
  category?: string | null, // 'motivation' | 'music' | 'soundscape' | 'guide'
  genreId?: string | null,
  /** What is playing, for the day's record (music/motivation only). */
  item?: { id: string; title: string } | null,
) {
  const statsRef = useRef(loadStats())
  const sessionStartRef = useRef<number | null>(null)
  /** Minutes the 60s tick already added for this session. */
  const tickedRef = useRef(0)
  // The item and category as they were DURING the session: by the time
  // isPlaying turns false, state may already describe the next thing.
  const sessionItemRef = useRef<{ kind: string; id: string; title: string } | null>(null)
  useEffect(() => {
    if (isPlaying && item && (category === 'music' || category === 'motivation')) {
      sessionItemRef.current = { kind: category, id: item.id, title: item.title }
    }
  }, [isPlaying, category, item?.id, item?.title]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track session start/stop
  useEffect(() => {
    if (isPlaying) {
      sessionStartRef.current = Date.now()
      tickedRef.current = 0
    } else if (sessionStartRef.current) {
      // Session ended — calculate duration
      const sessionSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000)
      const sessionMinutes = Math.round(sessionSeconds / 60)
      sessionStartRef.current = null

      // Only what the 60s tick has NOT already counted. Adding the whole
      // session here as well counted every listening minute twice — the
      // listening relics unlocked at about half the real time.
      const remaining = Math.max(0, sessionMinutes - tickedRef.current)
      tickedRef.current = 0
      if (sessionMinutes > 0) {
        const stats = statsRef.current
        stats.totalMinutes += remaining
        stats.todayMinutes += remaining
        stats.todayDate = getToday()
        stats.longestSession = Math.max(stats.longestSession, sessionMinutes)

        if (category) {
          stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + remaining
        }
        saveStats(stats)
      }

      // The day's record: a real sitting of music or motivation (the server
      // keeps only 10+ minutes — lib/audio-sessions). Context, never proof.
      const it = sessionItemRef.current
      sessionItemRef.current = null
      if (it && sessionSeconds >= MIN_CONTEXT_SECONDS) {
        fetch('/api/audio-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: it.kind, itemId: it.id, title: it.title, seconds: sessionSeconds, completed: false }),
        }).catch(() => { /* the record is best-effort */ })
      }
    }
  }, [isPlaying, category])

  // Track genres
  useEffect(() => {
    if (genreId && isPlaying) {
      const stats = statsRef.current
      if (!stats.genresPlayed.includes(genreId)) {
        stats.genresPlayed = [...stats.genresPlayed, genreId]
        saveStats(stats)
      }
    }
  }, [genreId, isPlaying])

  // Periodic update (every 60s while playing)
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      const stats = statsRef.current
      tickedRef.current += 1
      stats.totalMinutes += 1
      stats.todayMinutes += 1
      stats.todayDate = getToday()
      if (category) {
        stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + 1
      }
      saveStats(stats)
    }, 60000)
    return () => clearInterval(interval)
  }, [isPlaying, category])

  const getStats = useCallback(() => statsRef.current, [])

  return { getStats }
}

/**
 * Check audio-specific achievements based on listening stats.
 * Returns IDs of newly earned achievements.
 */
export function checkAudioAchievements(stats: ListeningStats): string[] {
  const earned: string[] = []

  // Listening milestones
  if (stats.totalMinutes >= 60) earned.push('listener_1hr')
  if (stats.totalMinutes >= 300) earned.push('listener_5hr')
  if (stats.totalMinutes >= 600) earned.push('listener_10hr')
  if (stats.totalMinutes >= 6000) earned.push('listener_100hr')

  // Session achievements
  if (stats.longestSession >= 60) earned.push('flow_master')     // 60+ min session
  if (stats.longestSession >= 120) earned.push('deep_flow')      // 2hr session

  // Genre explorer
  if (stats.genresPlayed.length >= 5) earned.push('genre_explorer_audio')
  if (stats.genresPlayed.length >= 7) earned.push('all_genres')

  // Listening streak
  if (stats.streakDays >= 7) earned.push('listening_streak_7')
  if (stats.streakDays >= 30) earned.push('listening_streak_30')

  // Night owl (checked elsewhere — based on time)
  const hour = new Date().getHours()
  if (hour >= 0 && hour < 5 && stats.todayMinutes > 0) earned.push('midnight_listener')

  return earned
}

// Audio achievement definitions for display
export const AUDIO_ACHIEVEMENTS = [
  { id: 'listener_1hr', title: 'First Hour', description: '1 hour of total listening', icon: '🎵', rarity: 'common' as const },
  { id: 'listener_5hr', title: 'Dedicated Listener', description: '5 hours of total listening', icon: '🎧', rarity: 'rare' as const },
  { id: 'listener_10hr', title: 'Sound Devotee', description: '10 hours of total listening', icon: '🎶', rarity: 'rare' as const },
  { id: 'listener_100hr', title: 'Audio Legend', description: '100 hours of total listening', icon: '👑', rarity: 'legendary' as const },
  { id: 'flow_master', title: 'Flow Master', description: '60+ minute listening session', icon: '🌊', rarity: 'rare' as const },
  { id: 'deep_flow', title: 'Deep Flow', description: '2+ hour listening session', icon: '🧘', rarity: 'epic' as const },
  { id: 'genre_explorer_audio', title: 'Sound Explorer', description: 'Played 5 different genres', icon: '🧭', rarity: 'rare' as const },
  { id: 'all_genres', title: 'Genre Master', description: 'Played all 7 music genres', icon: '🎹', rarity: 'epic' as const },
  { id: 'listening_streak_7', title: 'Weekly Listener', description: '7-day listening streak', icon: '🔥', rarity: 'common' as const },
  { id: 'listening_streak_30', title: 'Monthly Listener', description: '30-day listening streak', icon: '💎', rarity: 'epic' as const },
  { id: 'midnight_listener', title: 'Midnight Listener', description: 'Listened between midnight and 5 AM', icon: '🌙', rarity: 'common' as const },
]
