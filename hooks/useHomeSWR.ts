import useSWR, { mutate as globalMutate } from 'swr'
import { useCallback, useMemo } from 'react'
import type { VideoItem } from '@/components/home/home-types'

// --- Preferences ---
export function usePreferences() {
  const { data, error, isLoading, mutate } = useSWR<any>('/api/daily-guide/preferences')
  return {
    streak: data?.current_streak || 0,
    astrologyEnabled: data?.mindset === 'scholar',
    preferencesError: error,
    preferencesLoading: isLoading,
    mutatePreferences: mutate,
  }
}

// --- Journal Mood ---
export function useJournalMood(date: string) {
  const { data, error, isLoading } = useSWR<any>(
    date ? `/api/daily-guide/journal?date=${date}` : null
  )

  const hasJournaledToday = !!(data?.journal_mood || data?.journal_win || data?.journal_gratitude || data?.journal_freetext || data?.journal_dream)
  const modulesCompletedToday = [
    data?.morning_prime_done,
    data?.day_close_done,
    data?.movement_done,
    data?.micro_lesson_done,
  ].filter(Boolean).length

  return {
    journalData: data,
    journalMood: data?.journal_mood || null,
    moodBefore: data?.mood_before || null,
    energyLevel: data?.energy_level || null,
    hasJournaledToday,
    modulesCompletedToday,
    dailyIntention: data?.daily_intention || null,
    journalError: error,
    journalLoading: isLoading,
  }
}

// --- Motivation Videos ---
export function useMotivationVideos(topic: string) {
  const { data, error, isLoading, mutate } = useSWR<any>(
    topic ? `/api/motivation-videos?topic=${topic}` : null
  )
  return {
    motivationVideos: (data?.videos || []) as VideoItem[],
    motivationError: error,
    motivationLoading: isLoading,
    mutateMotivation: mutate,
  }
}

// --- Favorites ---
interface FavoriteRaw {
  id: string
  content_id?: string
  content_title?: string
  content_text: string
  thumbnail?: string
}

function parseFavorites(data: any, prefix: string) {
  const favorites: FavoriteRaw[] = data?.favorites || []
  const videos: VideoItem[] = []
  const ids = new Set<string>()
  const recordMap = new Map<string, string>()
  for (const f of favorites) {
    const youtubeId = f.content_id || ''
    if (!youtubeId) continue
    ids.add(youtubeId)
    recordMap.set(youtubeId, f.id)
    videos.push({
      id: `${prefix}-${f.id}`,
      youtubeId,
      title: f.content_title || f.content_text,
      channel: '',
      thumbnail: f.thumbnail,
    })
  }
  return { videos, ids, recordMap }
}

export function useFavorites(type: 'motivation' | 'music') {
  const prefix = type === 'motivation' ? 'fav' : 'mfav'
  const { data, error, isLoading, mutate } = useSWR<any>(`/api/favorites?type=${type}`)
  const parsed = useMemo(() => parseFavorites(data, prefix), [data, prefix])
  return {
    savedVideos: parsed.videos,
    favoriteIds: parsed.ids,
    favoriteRecordMap: parsed.recordMap,
    favoritesError: error,
    favoritesLoading: isLoading,
    mutateFavorites: mutate,
  }
}

// --- Genre Videos (conditional) ---
export function useGenreVideos(genreId: string, enabled: boolean) {
  const { data, error, isLoading, mutate } = useSWR<any>(
    enabled ? `/api/music-videos?genre=${genreId}` : null
  )
  return {
    genreVideos: (data?.videos || []) as VideoItem[],
    genreError: error,
    genreLoading: isLoading,
    mutateGenre: mutate,
  }
}

// --- Genre Backgrounds (conditional) ---
export function useGenreBackgrounds(genreId: string, enabled: boolean) {
  const { data, error, isLoading } = useSWR<any>(
    enabled ? `/api/backgrounds?genre=${genreId}` : null
  )
  return {
    genreBackgrounds: (data?.images || []).map((img: { url: string }) => img.url) as string[],
    bgError: error,
    bgLoading: isLoading,
  }
}

// --- Welcome Status ---
export function useWelcomeStatus() {
  const { data, error, isLoading } = useSWR<any>('/api/user/welcome-status')
  return {
    shouldShow: data?.shouldShow || false,
    daysAway: data?.daysAway || 0,
    lastStreak: data?.lastStreak || 0,
    welcomeError: error,
    welcomeLoading: isLoading,
  }
}

// --- Gamification Status ---
export function useGamificationStatus() {
  const { data, error, isLoading, mutate } = useSWR<any>('/api/gamification/status')
  const dailyChallenges = data?.dailyChallenges || []
  const allChallengesDone = dailyChallenges.length > 0 && dailyChallenges.every((c: any) => c.completed)

  // Check if freeze was used today
  const freezeLastUsed = data?.streakFreeze?.lastUsed
  const freezeUsedToday = !!freezeLastUsed && new Date(freezeLastUsed).toDateString() === new Date().toDateString()

  return {
    gamificationData: data,
    dailyBonusClaimed: data?.dailyBonus?.claimed || false,
    streakFreezes: data?.streakFreeze?.available ?? 1,
    freezeUsedToday,
    lastStreakLost: data?.lastStreakLost || null,
    allChallengesDone,
    gamificationError: error,
    gamificationLoading: isLoading,
    mutateGamification: mutate,
  }
}

// --- Batch genre data for all genres at once ---
// Since hooks can't be called in loops, this hook is called once per genre at top level.
// ImmersiveHome will call useGenreVideos/useGenreBackgrounds per genre.
// Alternatively, use this helper to prefetch all genre data:
export function prefetchAllGenres(genreIds: string[]) {
  for (const id of genreIds) {
    globalMutate(`/api/music-videos?genre=${id}`)
    globalMutate(`/api/backgrounds?genre=${id}`)
  }
}
