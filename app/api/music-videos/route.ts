import { NextRequest, NextResponse } from 'next/server'
import { getCachedVideos, setCachedVideos, getStaleCachedVideos } from '@/lib/video-cache'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// Search keywords for each music genre
const GENRE_SEARCHES: Record<string, string[]> = {
  lofi: ['lofi hip hop beats', 'lofi study music', 'lofi chill beats', 'lofi relaxing music', 'lofi coding music', 'lofi rainy day', 'lofi jazz beats', 'chillhop mix', 'lofi cafe vibes', 'lofi nighttime beats'],
  piano: ['relaxing piano music', 'peaceful piano', 'piano study music', 'calm piano instrumental', 'soft piano background music', 'emotional piano music', 'piano covers relaxing', 'classical piano relaxation', 'beautiful piano melodies', 'piano and rain'],
  jazz: ['smooth jazz music', 'relaxing jazz', 'jazz cafe music', 'jazz instrumental', 'bossa nova music', 'late night jazz saxophone', 'jazz piano trio', 'cool jazz relaxation', 'morning jazz coffee', 'jazz lounge background'],
  classical: ['classical music relaxing', 'classical study music', 'peaceful classical', 'classical piano', 'baroque music studying', 'mozart relaxing', 'chopin nocturnes', 'debussy relaxing piano', 'vivaldi four seasons', 'classical guitar peaceful'],
  ambient: ['ambient music relaxing', 'ambient study music', 'ambient background music', 'ambient meditation', 'space ambient music', 'dark ambient atmosphere', 'ethereal ambient sounds', 'cinematic ambient', 'healing ambient frequencies', 'nature ambient music'],
  study: ['study music concentration', 'focus music', 'deep focus music', 'study with me music', 'productive work music', 'flow state music', 'brain power music', 'concentration music instrumental', 'deep work focus', 'alpha waves study music'],
  sleep: ['sleep music relaxing', 'deep sleep music', 'sleep meditation music', 'calming music for sleep', 'healing sleep frequencies', 'delta waves sleep', 'sleep piano music', 'rain sounds for sleeping', 'bedtime music calm', 'peaceful night music sleep'],
}

// Daily genre rotation order
const GENRE_ORDER = ['lofi', 'piano', 'jazz', 'classical', 'ambient', 'study', 'sleep']

interface YouTubeVideo {
  id: string
  title: string
  youtubeId: string
  channel: string
  thumbnail: string
  duration?: number
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  return hours * 3600 + minutes * 60 + seconds
}

// Get today's genre based on date
function getTodaysGenre(): string {
  const today = new Date()
  // Use day of year to rotate through genres
  const startOfYear = new Date(today.getFullYear(), 0, 0)
  const diff = today.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  const genreIndex = dayOfYear % GENRE_ORDER.length
  return GENRE_ORDER[genreIndex]
}

// Return stale cached videos or empty array as a last resort
async function getFallback(genre: string) {
  const stale = await getStaleCachedVideos('music', genre)
  return stale || []
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const genre = searchParams.get('genre') || getTodaysGenre()
  const shuffle = searchParams.get('shuffle') === 'true'
  const seedParam = searchParams.get('seed')

  // When shuffle is requested, skip normal cache and use seed for deterministic selection
  if (!shuffle) {
    // Check cache first - only fetch once per day per genre
    const cachedVideos = await getCachedVideos('music', genre)
    if (cachedVideos && cachedVideos.length > 0) {
      console.log(`[Music Videos] Using cached videos for "${genre}"`)
      return NextResponse.json({
        videos: cachedVideos,
        genre,
        todaysGenre: getTodaysGenre(),
        cached: true,
      })
    }
  }

  // No API key - use stale cache or return empty
  if (!YOUTUBE_API_KEY) {
    const fallback = await getFallback(genre)
    if (shuffle && seedParam && fallback.length > 0) {
      const seed = parseInt(seedParam, 10) || Date.now()
      const shuffled = [...fallback]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const x = Math.sin(seed + i) * 10000
        const j = Math.floor((x - Math.floor(x)) * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return NextResponse.json({ videos: shuffled, genre, todaysGenre: getTodaysGenre(), fallback: true })
    }
    return NextResponse.json({ videos: fallback, genre, todaysGenre: getTodaysGenre(), fallback: true })
  }

  const searchTerms = GENRE_SEARCHES[genre] || GENRE_SEARCHES['lofi']
  let randomSearch: string
  if (shuffle && seedParam) {
    const seed = parseInt(seedParam, 10) || 0
    const x = Math.sin(seed) * 10000
    const idx = Math.floor((x - Math.floor(x)) * searchTerms.length)
    randomSearch = searchTerms[idx]
  } else {
    randomSearch = searchTerms[Math.floor(Math.random() * searchTerms.length)]
  }

  try {
    // Search for videos - filter by embeddable
    const ytSearchParams = new URLSearchParams({
      part: 'snippet',
      q: randomSearch,
      type: 'video',
      maxResults: '25',
      order: 'relevance',
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      videoDuration: 'long', // Over 20 minutes for background music
      relevanceLanguage: 'en',
      regionCode: 'US',
      key: YOUTUBE_API_KEY,
    })

    const searchResponse = await fetch(`${YOUTUBE_API_BASE}/search?${ytSearchParams}`)

    if (!searchResponse.ok) {
      const error = await searchResponse.text()
      console.error('[YouTube API] Music search error:', error)
      // Return stale cached videos on API error
      const fallback = await getFallback(genre)
      if (fallback.length > 0) {
        await setCachedVideos('music', genre, fallback)
      }
      return NextResponse.json({ videos: fallback, genre, todaysGenre: getTodaysGenre(), fallback: true })
    }

    const searchData = await searchResponse.json()
    const videoIds = searchData.items?.map((item: any) => item.id.videoId).join(',')

    if (!videoIds) {
      return NextResponse.json({ videos: [], genre, todaysGenre: getTodaysGenre() })
    }

    // Get video details to verify embeddable status and get duration
    const detailsParams = new URLSearchParams({
      part: 'status,contentDetails,snippet',
      id: videoIds,
      key: YOUTUBE_API_KEY,
    })

    const detailsResponse = await fetch(`${YOUTUBE_API_BASE}/videos?${detailsParams}`)
    const detailsData = await detailsResponse.json()

    // Filter to only truly embeddable videos
    const videos: YouTubeVideo[] = []

    for (const video of detailsData.items || []) {
      // Double-check embeddable status
      if (!video.status?.embeddable) {
        continue
      }

      const duration = parseDuration(video.contentDetails?.duration || '')

      // Filter: at least 10 minutes for background music
      if (duration < 600) {
        continue
      }

      videos.push({
        id: video.id,
        youtubeId: video.id,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        thumbnail: video.snippet.thumbnails?.maxres?.url ||
                   video.snippet.thumbnails?.standard?.url ||
                   video.snippet.thumbnails?.high?.url ||
                   `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
        duration,
      })
    }

    // Return up to 10 videos and cache them (skip cache for shuffle — it's user-triggered)
    const finalVideos = videos.slice(0, 10)

    if (finalVideos.length > 0 && !shuffle) {
      await setCachedVideos('music', genre, finalVideos)
    }

    return NextResponse.json({
      videos: finalVideos,
      genre,
      todaysGenre: getTodaysGenre(),
      searchTerm: randomSearch,
    })

  } catch (error) {
    console.error('[YouTube API] Music error:', error)
    // Return stale cached videos on error
    const fallback = await getFallback(genre)
    if (fallback.length > 0) {
      setCachedVideos('music', genre, fallback)
    }
    return NextResponse.json({ videos: fallback, genre, todaysGenre: getTodaysGenre(), fallback: true })
  }
}
