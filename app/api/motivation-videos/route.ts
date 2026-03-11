import { NextRequest, NextResponse } from 'next/server'
import { getCachedVideos, setCachedVideos, getStaleCachedVideos } from '@/lib/video-cache'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// Search keywords for each motivation topic
const TOPIC_SEARCHES: Record<string, string[]> = {
  Discipline: ['discipline motivational speech', 'self discipline motivation', 'discipline mindset'],
  Focus: ['focus motivational speech', 'concentration motivation', 'eliminate distractions motivation'],
  Mindset: ['mindset motivational speech', 'winning mindset motivation', 'growth mindset speech'],
  Courage: ['courage motivational speech', 'face your fears motivation', 'be brave speech'],
  Resilience: ['never give up motivational speech', 'resilience motivation', 'keep going motivation'],
  Hustle: ['work hard motivational speech', 'grind motivation', 'hustle motivation speech'],
  Confidence: ['confidence motivational speech', 'believe in yourself motivation', 'self belief speech'],
}

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

// Return stale cached videos or empty array as a last resort
async function getFallback(topic: string) {
  const stale = await getStaleCachedVideos('motivation', topic)
  return stale || []
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const topic = searchParams.get('topic') || 'Discipline'
  const shuffle = searchParams.get('shuffle') === 'true'
  const seedParam = searchParams.get('seed')

  // When shuffle is requested, skip normal cache and use seed for deterministic selection
  if (!shuffle) {
    // Check cache first - only fetch once per day per topic
    const cachedVideos = await getCachedVideos('motivation', topic)
    if (cachedVideos && cachedVideos.length > 0) {
      console.log(`[Motivation Videos] Using cached videos for "${topic}"`)
      return NextResponse.json({
        videos: cachedVideos,
        topic,
        cached: true,
      })
    }
  }

  // No API key - use stale cache or return empty
  if (!YOUTUBE_API_KEY) {
    const fallback = await getFallback(topic)
    if (shuffle && seedParam && fallback.length > 0) {
      const seed = parseInt(seedParam, 10) || Date.now()
      const shuffled = [...fallback]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const x = Math.sin(seed + i) * 10000
        const j = Math.floor((x - Math.floor(x)) * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return NextResponse.json({ videos: shuffled, topic, fallback: true })
    }
    return NextResponse.json({ videos: fallback, topic, fallback: true })
  }

  const searchTerms = TOPIC_SEARCHES[topic] || TOPIC_SEARCHES['Discipline']
  let randomSearch: string
  if (shuffle && seedParam) {
    // Use seed to deterministically pick a different search term
    const seed = parseInt(seedParam, 10) || 0
    const x = Math.sin(seed) * 10000
    const idx = Math.floor((x - Math.floor(x)) * searchTerms.length)
    randomSearch = searchTerms[idx]
  } else {
    randomSearch = searchTerms[Math.floor(Math.random() * searchTerms.length)]
  }

  try {
    // Search for videos - filter by embeddable and English only
    const ytSearchParams = new URLSearchParams({
      part: 'snippet',
      q: `${randomSearch} english`,
      type: 'video',
      maxResults: '20',
      order: 'relevance',
      videoEmbeddable: 'true', // Only embeddable videos
      videoSyndicated: 'true', // Can play outside YouTube
      videoDuration: 'long', // 20+ minutes
      relevanceLanguage: 'en', // Prefer English results
      regionCode: 'US', // US region for English content
      key: YOUTUBE_API_KEY,
    })

    const searchResponse = await fetch(`${YOUTUBE_API_BASE}/search?${ytSearchParams}`)

    if (!searchResponse.ok) {
      const error = await searchResponse.text()
      console.error('[YouTube API] Search error:', error)
      // Return stale cached videos on API error (quota exceeded, etc.)
      const fallback = await getFallback(topic)
      if (fallback.length > 0) {
        await setCachedVideos('motivation', topic, fallback)
      }
      return NextResponse.json({ videos: fallback, topic, fallback: true })
    }

    const searchData = await searchResponse.json()
    const videoIds = searchData.items?.map((item: any) => item.id.videoId).join(',')

    if (!videoIds) {
      return NextResponse.json({ videos: [] })
    }

    // Get video details to verify embeddable status and get duration
    const detailsParams = new URLSearchParams({
      part: 'status,contentDetails,snippet',
      id: videoIds,
      key: YOUTUBE_API_KEY,
    })

    const detailsResponse = await fetch(`${YOUTUBE_API_BASE}/videos?${detailsParams}`)
    const detailsData = await detailsResponse.json()

    // Filter to only truly embeddable English videos
    const videos: YouTubeVideo[] = []

    // Common non-English characters to filter out
    const nonEnglishPattern = /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/

    for (const video of detailsData.items || []) {
      // Double-check embeddable status
      if (!video.status?.embeddable) {
        continue
      }

      const title = video.snippet.title || ''

      // Skip videos with non-English characters in title
      if (nonEnglishPattern.test(title)) {
        continue
      }

      // Check if video language is English (if available)
      const defaultLanguage = video.snippet?.defaultLanguage || video.snippet?.defaultAudioLanguage
      if (defaultLanguage && !defaultLanguage.startsWith('en')) {
        continue
      }

      const duration = parseDuration(video.contentDetails?.duration || '')

      // Filter: 10+ minutes for motivation videos
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

    // Return up to 8 videos and cache them
    const finalVideos = videos.slice(0, 8)

    // Cache the results for today (skip cache for shuffle — it's user-triggered)
    if (finalVideos.length > 0 && !shuffle) {
      await setCachedVideos('motivation', topic, finalVideos)
    }

    return NextResponse.json({
      videos: finalVideos,
      topic,
      searchTerm: randomSearch,
    })

  } catch (error) {
    console.error('[YouTube API] Error:', error)
    // Return stale cached videos on any error
    const fallback = await getFallback(topic)
    if (fallback.length > 0) {
      setCachedVideos('motivation', topic, fallback)
    }
    return NextResponse.json({ videos: fallback, topic, fallback: true })
  }
}
