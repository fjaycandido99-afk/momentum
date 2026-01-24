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
    { id: 'd1', title: 'SELF DISCIPLINE - Best Motivational Speech', youtubeId: 'W_VkLpnVFFo', channel: 'Motiversity', duration: 300 },
    { id: 'd2', title: 'THE POWER OF DISCIPLINE - Motivational Video', youtubeId: 'nm1TxQj9IsQ', channel: 'Motiversity', duration: 280 },
    { id: 'd3', title: 'DISCIPLINE YOUR MIND - Motivational Speech', youtubeId: 'v_1iqtOnUMg', channel: 'MotivationHub', duration: 260 },
    { id: 'd4', title: 'NO EXCUSES - Best Motivational Video', youtubeId: 'wnHW6o8WMas', channel: 'Motiversity', duration: 290 },
    { id: 'd5', title: 'OUTWORK EVERYONE - David Goggins Motivation', youtubeId: '2bm47ypLvTA', channel: 'MotivationHub', duration: 275 },
    { id: 'd6', title: 'THIS IS WHY DISCIPLINE MATTERS', youtubeId: 'dFfXEsnRHxE', channel: 'Absolute Motivation', duration: 285 },
    { id: 'd7', title: 'DISCIPLINE IS FREEDOM - Jocko Willink', youtubeId: 'IdTMDpizis8', channel: 'T&H Inspiration', duration: 270 },
    { id: 'd8', title: 'BUILD UNBREAKABLE DISCIPLINE', youtubeId: '8PGG2YPczU4', channel: 'MotivationHub', duration: 295 },
  ],
  Focus: [
    { id: 'f1', title: 'FOCUS ON YOURSELF - Best Motivational Speech', youtubeId: 'J1R0hiaHdpM', channel: 'Motiversity', duration: 290 },
    { id: 'f2', title: 'STOP WASTING TIME - Motivational Video', youtubeId: 'cDDWvj_q-o8', channel: 'Motiversity', duration: 275 },
    { id: 'f3', title: 'LASER FOCUS - Powerful Motivational Speech', youtubeId: 'k9zTr2MAFRg', channel: 'MotivationHub', duration: 280 },
    { id: 'f4', title: 'THIS IS HOW WINNERS THINK', youtubeId: 'nU3IbigrFFs', channel: 'Motiversity', duration: 265 },
    { id: 'f5', title: 'CONTROL YOUR ATTENTION - Motivational Speech', youtubeId: 'fOGPpDzMWyE', channel: 'Absolute Motivation', duration: 285 },
    { id: 'f6', title: 'BECOME OBSESSED - Motivational Video', youtubeId: 'hZZ5dZzvsEM', channel: 'MotivationHub', duration: 270 },
    { id: 'f7', title: 'THE POWER OF FOCUS - Jim Rohn', youtubeId: 'vj-91dMvQQo', channel: 'T&H Inspiration', duration: 295 },
    { id: 'f8', title: 'ELIMINATE DISTRACTIONS - Motivational Speech', youtubeId: '7z0fDsET3bM', channel: 'Motiversity', duration: 280 },
  ],
  Mindset: [
    { id: 'm1', title: 'CHANGE YOUR MINDSET - Motivational Speech', youtubeId: 'GXoErccq0vw', channel: 'Motiversity', duration: 285 },
    { id: 'm2', title: 'MINDSET IS EVERYTHING - Powerful Speech', youtubeId: '_UJfwCuLYbI', channel: 'Motiversity', duration: 275 },
    { id: 'm3', title: 'THINK DIFFERENT - Steve Jobs', youtubeId: 'keCwRdbwNQY', channel: 'Motivation2Study', duration: 260 },
    { id: 'm4', title: 'THE MINDSET OF A CHAMPION', youtubeId: 'yM8jrvF5zYs', channel: 'MotivationHub', duration: 290 },
    { id: 'm5', title: 'TRAIN YOUR MIND TO WIN', youtubeId: 'R8V71MbHP7k', channel: 'Absolute Motivation', duration: 280 },
    { id: 'm6', title: 'YOUR MIND IS POWERFUL - Les Brown', youtubeId: 'ULT_3CboVlE', channel: 'T&H Inspiration', duration: 295 },
    { id: 'm7', title: 'DEVELOP A WINNING MINDSET', youtubeId: 'k0oZ38JnPvM', channel: 'MotivationHub', duration: 270 },
    { id: 'm8', title: 'REPROGRAM YOUR MIND - Motivation', youtubeId: 'F1gIhn5lRl0', channel: 'Motiversity', duration: 285 },
  ],
  Courage: [
    { id: 'c1', title: 'FACE YOUR FEARS - Motivational Speech', youtubeId: 'II4xp4vzRT8', channel: 'Motiversity', duration: 280 },
    { id: 'c2', title: 'BE FEARLESS - Powerful Motivation', youtubeId: '2MvAtEr0W3g', channel: 'MotivationHub', duration: 275 },
    { id: 'c3', title: 'COURAGE - Best Motivational Video', youtubeId: 'mgmVOuLgFB0', channel: 'Motiversity', duration: 290 },
    { id: 'c4', title: 'TAKE THE RISK - Motivational Speech', youtubeId: 'pO_Z0H3gDPg', channel: 'Motiversity', duration: 265 },
    { id: 'c5', title: 'DO IT AFRAID - Powerful Speech', youtubeId: 'u7L89w3xmgY', channel: 'Absolute Motivation', duration: 285 },
    { id: 'c6', title: 'STEP OUT OF YOUR COMFORT ZONE', youtubeId: 'qCEQbTf7SBc', channel: 'T&H Inspiration', duration: 270 },
    { id: 'c7', title: 'CONQUER YOUR FEARS - Motivation', youtubeId: '1_9V5t6Wpfk', channel: 'MotivationHub', duration: 295 },
    { id: 'c8', title: 'BE BRAVE - Motivational Video', youtubeId: 'vNrLPniDMvk', channel: 'Motiversity', duration: 280 },
  ],
  Resilience: [
    { id: 'r1', title: 'NEVER GIVE UP - Motivational Speech', youtubeId: 'kZlXWp6vFdE', channel: 'Motiversity', duration: 285 },
    { id: 'r2', title: 'KEEP GOING - Best Motivation', youtubeId: '8ZhoeSaPF-k', channel: 'Motiversity', duration: 275 },
    { id: 'r3', title: 'RISE UP - Powerful Motivational Speech', youtubeId: 'TqXLvwM8Ltk', channel: 'MotivationHub', duration: 290 },
    { id: 'r4', title: 'UNBREAKABLE - Motivational Video', youtubeId: 'p6HPRqCIZOQ', channel: 'Motiversity', duration: 280 },
    { id: 'r5', title: 'BOUNCE BACK STRONGER', youtubeId: '3eVIOiF9vF0', channel: 'Absolute Motivation', duration: 270 },
    { id: 'r6', title: 'WHEN LIFE KNOCKS YOU DOWN', youtubeId: 'FFgwBHpbsgM', channel: 'MotivationHub', duration: 295 },
    { id: 'r7', title: 'THE COMEBACK - Les Brown', youtubeId: 'rRNzpFbcNqI', channel: 'T&H Inspiration', duration: 265 },
    { id: 'r8', title: 'I WILL NOT QUIT - Motivation', youtubeId: 'F7bE1LMN1QU', channel: 'Motiversity', duration: 285 },
  ],
  Hustle: [
    { id: 'h1', title: 'WORK HARDER THAN EVERYONE - Motivation', youtubeId: 'g9_6RPn5VBs', channel: 'Motiversity', duration: 290 },
    { id: 'h2', title: 'GRIND NOW SHINE LATER - Motivation', youtubeId: 'P8P6RgUIhFg', channel: 'Motiversity', duration: 275 },
    { id: 'h3', title: 'NO DAYS OFF - Motivational Speech', youtubeId: '2X-8L5GBD-A', channel: 'Motiversity', duration: 280 },
    { id: 'h4', title: 'RISE AND GRIND - Motivational Video', youtubeId: 'G-J0lkyhz7o', channel: 'MotivationHub', duration: 285 },
    { id: 'h5', title: 'HUSTLE IN SILENCE - Powerful Speech', youtubeId: 'PyHXN_eYkpc', channel: 'Absolute Motivation', duration: 270 },
    { id: 'h6', title: 'THE GRIND - Best Motivation', youtubeId: 'qZSb5gVW9lM', channel: 'MotivationHub', duration: 295 },
    { id: 'h7', title: 'WORK WHILE THEY SLEEP', youtubeId: 'Rj_n7R0gptU', channel: 'T&H Inspiration', duration: 265 },
    { id: 'h8', title: 'OUTWORK EVERYONE AROUND YOU', youtubeId: 'HQtZ4kud2qA', channel: 'Motiversity', duration: 280 },
  ],
  Confidence: [
    { id: 'cf1', title: 'BELIEVE IN YOURSELF - Motivational Speech', youtubeId: 'FTnCMxN_JCY', channel: 'Motiversity', duration: 285 },
    { id: 'cf2', title: 'SELF CONFIDENCE - Powerful Motivation', youtubeId: 'w-HYZv6HzAs', channel: 'MotivationHub', duration: 275 },
    { id: 'cf3', title: 'KNOW YOUR WORTH - Motivational Video', youtubeId: 'sPaJTS33Qzc', channel: 'Motiversity', duration: 290 },
    { id: 'cf4', title: 'OWN YOUR POWER - Motivational Speech', youtubeId: 'lq_BvBpVeG8', channel: 'Motiversity', duration: 280 },
    { id: 'cf5', title: 'YOU ARE ENOUGH - Powerful Speech', youtubeId: 'Rj_n7R0gptU', channel: 'Absolute Motivation', duration: 270 },
    { id: 'cf6', title: 'BUILD UNSHAKEABLE CONFIDENCE', youtubeId: 'mK68F6YFkrQ', channel: 'MotivationHub', duration: 295 },
    { id: 'cf7', title: 'TRUST YOURSELF - Motivation', youtubeId: 'FN7ao8dSEUE', channel: 'T&H Inspiration', duration: 265 },
    { id: 'cf8', title: 'SELF BELIEF - Powerful Motivation', youtubeId: 'YKfV9GH4qYQ', channel: 'Motiversity', duration: 285 },
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
  const cachedVideos = getCachedVideos('motivation', topic)
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
      videoDuration: 'medium', // 4-20 minutes
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
      setCachedVideos('motivation', topic, fallback)

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

      // Filter: 2-15 minutes for motivation videos
      if (duration < 120 || duration > 900) {
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
      setCachedVideos('motivation', topic, finalVideos)
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
