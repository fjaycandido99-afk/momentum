import { NextRequest, NextResponse } from 'next/server'
import { getCachedVideos, setCachedVideos } from '@/lib/video-cache'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// Fallback videos when YouTube API quota is exceeded
// Same curated videos as Discover page - verified embeddable
const FALLBACK_VIDEOS: Record<string, Array<{
  id: string
  youtubeId: string
  title: string
  channel: string
  duration?: number
}>> = {
  Discipline: [
    { id: 'd1', youtubeId: 'W_VkLpnVFFo', title: 'SELF DISCIPLINE - Best Motivational Speech', channel: 'Motiversity', duration: 1800 },
    { id: 'd2', youtubeId: 'nm1TxQj9IsQ', title: 'THE POWER OF DISCIPLINE - Motivational Video', channel: 'Motiversity', duration: 1920 },
    { id: 'd3', youtubeId: 'v_1iqtOnUMg', title: 'DISCIPLINE YOUR MIND - Motivational Speech', channel: 'MotivationHub', duration: 2100 },
    { id: 'd4', youtubeId: 'wnHW6o8WMas', title: 'NO EXCUSES - Best Motivational Video', channel: 'Motiversity', duration: 1680 },
  ],
  Focus: [
    { id: 'f1', youtubeId: 'J1R0hiaHdpM', title: 'FOCUS ON YOURSELF - Best Motivational Speech', channel: 'Motiversity', duration: 1800 },
    { id: 'f2', youtubeId: 'cDDWvj_q-o8', title: 'STOP WASTING TIME - Motivational Video', channel: 'Motiversity', duration: 1920 },
    { id: 'f3', youtubeId: 'k9zTr2MAFRg', title: 'LASER FOCUS - Powerful Motivational Speech', channel: 'MotivationHub', duration: 2100 },
    { id: 'f4', youtubeId: 'nU3IbigrFFs', title: 'THIS IS HOW WINNERS THINK', channel: 'Motiversity', duration: 1680 },
  ],
  Mindset: [
    { id: 'm1', youtubeId: 'GXoErccq0vw', title: 'CHANGE YOUR MINDSET - Motivational Speech', channel: 'Motiversity', duration: 1800 },
    { id: 'm2', youtubeId: '_UJfwCuLYbI', title: 'MINDSET IS EVERYTHING - Powerful Speech', channel: 'Motiversity', duration: 1920 },
    { id: 'm3', youtubeId: 'keCwRdbwNQY', title: 'THE MINDSET OF A CHAMPION', channel: 'MotivationHub', duration: 2100 },
    { id: 'm4', youtubeId: 'yM8jrvF5zYs', title: 'TRAIN YOUR MIND TO WIN', channel: 'Absolute Motivation', duration: 1680 },
  ],
  Courage: [
    { id: 'c1', youtubeId: 'II4xp4vzRT8', title: 'FACE YOUR FEARS - Motivational Speech', channel: 'Motiversity', duration: 1800 },
    { id: 'c2', youtubeId: '2MvAtEr0W3g', title: 'BE FEARLESS - Powerful Motivation', channel: 'MotivationHub', duration: 1920 },
    { id: 'c3', youtubeId: 'mgmVOuLgFB0', title: 'COURAGE - Best Motivational Video', channel: 'Motiversity', duration: 2100 },
    { id: 'c4', youtubeId: 'pO_Z0H3gDPg', title: 'TAKE THE RISK - Motivational Speech', channel: 'Motiversity', duration: 1680 },
  ],
  Resilience: [
    { id: 'r1', youtubeId: 'kZlXWp6vFdE', title: 'NEVER GIVE UP - Motivational Speech', channel: 'Motiversity', duration: 1800 },
    { id: 'r2', youtubeId: '8ZhoeSaPF-k', title: 'KEEP GOING - Best Motivation', channel: 'Motiversity', duration: 1920 },
    { id: 'r3', youtubeId: 'TqXLvwM8Ltk', title: 'RISE UP - Powerful Motivational Speech', channel: 'MotivationHub', duration: 2100 },
    { id: 'r4', youtubeId: 'p6HPRqCIZOQ', title: 'UNBREAKABLE - Motivational Video', channel: 'Motiversity', duration: 1680 },
  ],
  Hustle: [
    { id: 'h1', youtubeId: 'g9_6RPn5VBs', title: 'WORK HARDER THAN EVERYONE - Motivation', channel: 'Motiversity', duration: 1800 },
    { id: 'h2', youtubeId: 'P8P6RgUIhFg', title: 'GRIND NOW SHINE LATER - Motivation', channel: 'Motiversity', duration: 1920 },
    { id: 'h3', youtubeId: '2X-8L5GBD-A', title: 'NO DAYS OFF - Motivational Speech', channel: 'Motiversity', duration: 2100 },
    { id: 'h4', youtubeId: 'G-J0lkyhz7o', title: 'RISE AND GRIND - Motivational Video', channel: 'MotivationHub', duration: 1680 },
  ],
  Confidence: [
    { id: 'cf1', youtubeId: 'FTnCMxN_JCY', title: 'BELIEVE IN YOURSELF - Motivational Speech', channel: 'Motiversity', duration: 1800 },
    { id: 'cf2', youtubeId: 'w-HYZv6HzAs', title: 'SELF CONFIDENCE - Powerful Motivation', channel: 'MotivationHub', duration: 1920 },
    { id: 'cf3', youtubeId: 'sPaJTS33Qzc', title: 'KNOW YOUR WORTH - Motivational Video', channel: 'Motiversity', duration: 2100 },
    { id: 'cf4', youtubeId: 'lq_BvBpVeG8', title: 'OWN YOUR POWER - Motivational Speech', channel: 'Motiversity', duration: 1680 },
  ],
}

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const topic = searchParams.get('topic') || 'Discipline'

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

  // No API key - use fallback videos
  if (!YOUTUBE_API_KEY) {
    const fallback = FALLBACK_VIDEOS[topic] || FALLBACK_VIDEOS['Discipline']
    return NextResponse.json({
      videos: fallback,
      topic,
      fallback: true,
    })
  }

  const searchTerms = TOPIC_SEARCHES[topic] || TOPIC_SEARCHES['Discipline']
  const randomSearch = searchTerms[Math.floor(Math.random() * searchTerms.length)]

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
      // Return fallback videos on API error (quota exceeded, etc.)
      const fallback = FALLBACK_VIDEOS[topic] || FALLBACK_VIDEOS['Discipline']

      // Cache fallback so we don't keep hitting the API today
      await setCachedVideos('motivation', topic, fallback)

      return NextResponse.json({
        videos: fallback,
        topic,
        fallback: true,
      })
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
      const description = video.snippet.description || ''

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
        thumbnail: video.snippet.thumbnails?.high?.url ||
                   video.snippet.thumbnails?.medium?.url ||
                   `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`,
        duration,
      })
    }

    // Return up to 8 videos and cache them
    const finalVideos = videos.slice(0, 8)

    // Cache the results for today
    if (finalVideos.length > 0) {
      await setCachedVideos('motivation', topic, finalVideos)
    }

    return NextResponse.json({
      videos: finalVideos,
      topic,
      searchTerm: randomSearch,
    })

  } catch (error) {
    console.error('[YouTube API] Error:', error)
    // Return fallback videos on any error and cache them
    const fallback = FALLBACK_VIDEOS[topic] || FALLBACK_VIDEOS['Discipline']

    // Cache fallback so we don't keep hitting the API
    setCachedVideos('motivation', topic, fallback)

    return NextResponse.json({
      videos: fallback,
      topic,
      fallback: true,
    })
  }
}
