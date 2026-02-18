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
    { id: 'd5', youtubeId: 'dkHn3ciJg9o', title: 'DISCIPLINE - Powerful Motivational Speech', channel: 'Ben Lionel Scott', duration: 1920 },
    { id: 'd6', youtubeId: 'g-jwWYX7Jlo', title: 'SELF MASTERY - Motivational Video Compilation', channel: 'Be Inspired', duration: 2040 },
    { id: 'd7', youtubeId: 'dYTz-nm8Nqs', title: 'DISCIPLINE IS DESTINY - Motivational Speech', channel: 'Absolute Motivation', duration: 1800 },
    { id: 'd8', youtubeId: 'IAAI7aLFjpA', title: 'THE SECRET TO SELF DISCIPLINE', channel: 'Motivation2Study', duration: 1740 },
  ],
  Focus: [
    { id: 'f1', youtubeId: 'J1R0hiaHdpM', title: 'FOCUS ON YOURSELF - Best Motivational Speech', channel: 'Motiversity', duration: 1800 },
    { id: 'f2', youtubeId: 'cDDWvj_q-o8', title: 'STOP WASTING TIME - Motivational Video', channel: 'Motiversity', duration: 1920 },
    { id: 'f3', youtubeId: 'k9zTr2MAFRg', title: 'LASER FOCUS - Powerful Motivational Speech', channel: 'MotivationHub', duration: 2100 },
    { id: 'f4', youtubeId: 'nU3IbigrFFs', title: 'THIS IS HOW WINNERS THINK', channel: 'Motiversity', duration: 1680 },
    { id: 'f5', youtubeId: 'QqfjiUqJNTo', title: 'FOCUS - Best Motivational Video Speeches', channel: 'Ben Lionel Scott', duration: 1860 },
    { id: 'f6', youtubeId: 'iGGDnFfkUqo', title: 'LOCK IN AND FOCUS - Motivational Speech', channel: 'Be Inspired', duration: 2040 },
    { id: 'f7', youtubeId: 'VSceuiPBpxY', title: 'CUT THE DISTRACTIONS - Powerful Speech', channel: 'Team Fearless', duration: 1920 },
    { id: 'f8', youtubeId: 'TQMbvJNRpLE', title: 'FOCUS ON YOUR GOALS - Study Motivation', channel: 'Motivation2Study', duration: 1800 },
  ],
  Mindset: [
    { id: 'm1', youtubeId: 'GXoErccq0vw', title: 'CHANGE YOUR MINDSET - Motivational Speech', channel: 'Motiversity', duration: 1800 },
    { id: 'm2', youtubeId: '_UJfwCuLYbI', title: 'MINDSET IS EVERYTHING - Powerful Speech', channel: 'Motiversity', duration: 1920 },
    { id: 'm3', youtubeId: 'keCwRdbwNQY', title: 'THE MINDSET OF A CHAMPION', channel: 'MotivationHub', duration: 2100 },
    { id: 'm4', youtubeId: 'yM8jrvF5zYs', title: 'TRAIN YOUR MIND TO WIN', channel: 'Absolute Motivation', duration: 1680 },
    { id: 'm5', youtubeId: 'OMJKLfDYMCE', title: 'REPROGRAM YOUR MIND - Motivational Speech', channel: 'Ben Lionel Scott', duration: 1920 },
    { id: 'm6', youtubeId: '1fuelMqdStg', title: 'THINK LIKE A WINNER - Motivational Video', channel: 'Be Inspired', duration: 2040 },
    { id: 'm7', youtubeId: 'Vb_4Kk2XBKU', title: 'CONQUER YOUR MIND - Powerful Motivation', channel: 'Fearless Soul', duration: 1800 },
    { id: 'm8', youtubeId: '7Oxz060iedY', title: 'BUILD A STRONG MINDSET - Study Motivation', channel: 'Motivation2Study', duration: 1740 },
  ],
  Courage: [
    { id: 'c1', youtubeId: 'II4xp4vzRT8', title: 'FACE YOUR FEARS - Motivational Speech', channel: 'Motiversity', duration: 1800 },
    { id: 'c2', youtubeId: '2MvAtEr0W3g', title: 'BE FEARLESS - Powerful Motivation', channel: 'MotivationHub', duration: 1920 },
    { id: 'c3', youtubeId: 'mgmVOuLgFB0', title: 'COURAGE - Best Motivational Video', channel: 'Motiversity', duration: 2100 },
    { id: 'c4', youtubeId: 'pO_Z0H3gDPg', title: 'TAKE THE RISK - Motivational Speech', channel: 'Motiversity', duration: 1680 },
    { id: 'c5', youtubeId: 'Do-EfBE0_Ik', title: 'STEP INTO YOUR FEARS - Motivational Speech', channel: 'Ben Lionel Scott', duration: 1860 },
    { id: 'c6', youtubeId: 'rKcCJhSaChs', title: 'UNSTOPPABLE - Powerful Motivational Video', channel: 'Be Inspired', duration: 2040 },
    { id: 'c7', youtubeId: 'ZsCKMjkOKIw', title: 'FEAR NOTHING - Motivational Compilation', channel: 'Team Fearless', duration: 1920 },
    { id: 'c8', youtubeId: 'LBXyVIFjaYs', title: 'YOU ARE BRAVE - Inspirational Speech', channel: 'Fearless Soul', duration: 1800 },
  ],
  Resilience: [
    { id: 'r1', youtubeId: 'kZlXWp6vFdE', title: 'NEVER GIVE UP - Motivational Speech', channel: 'Motiversity', duration: 1800 },
    { id: 'r2', youtubeId: '8ZhoeSaPF-k', title: 'KEEP GOING - Best Motivation', channel: 'Motiversity', duration: 1920 },
    { id: 'r3', youtubeId: 'TqXLvwM8Ltk', title: 'RISE UP - Powerful Motivational Speech', channel: 'MotivationHub', duration: 2100 },
    { id: 'r4', youtubeId: 'p6HPRqCIZOQ', title: 'UNBREAKABLE - Motivational Video', channel: 'Motiversity', duration: 1680 },
    { id: 'r5', youtubeId: 'CZFK4AW0Y5k', title: 'GET BACK UP - Motivational Speech', channel: 'Ben Lionel Scott', duration: 1920 },
    { id: 'r6', youtubeId: 'kCQHy_gBRvc', title: 'RESILIENCE - Powerful Motivational Video', channel: 'Be Inspired', duration: 2040 },
    { id: 'r7', youtubeId: 'dqTTojTija8', title: 'KEEP FIGHTING - Best Motivational Video', channel: 'Absolute Motivation', duration: 1800 },
    { id: 'r8', youtubeId: 'O2arpTO23dk', title: 'NEVER STOP TRYING - Inspirational Speech', channel: 'Fearless Soul', duration: 1740 },
  ],
  Hustle: [
    { id: 'h1', youtubeId: 'g9_6RPn5VBs', title: 'WORK HARDER THAN EVERYONE - Motivation', channel: 'Motiversity', duration: 1800 },
    { id: 'h2', youtubeId: 'P8P6RgUIhFg', title: 'GRIND NOW SHINE LATER - Motivation', channel: 'Motiversity', duration: 1920 },
    { id: 'h3', youtubeId: '2X-8L5GBD-A', title: 'NO DAYS OFF - Motivational Speech', channel: 'Motiversity', duration: 2100 },
    { id: 'h4', youtubeId: 'G-J0lkyhz7o', title: 'RISE AND GRIND - Motivational Video', channel: 'MotivationHub', duration: 1680 },
    { id: 'h5', youtubeId: 'ilKXD8dBEUo', title: 'OUTWORK THEM ALL - Motivational Speech', channel: 'Ben Lionel Scott', duration: 1860 },
    { id: 'h6', youtubeId: 'AVDgwRciVZc', title: 'THE GRIND - Best Motivational Video', channel: 'Be Inspired', duration: 2040 },
    { id: 'h7', youtubeId: 'kDeYMDGX_WA', title: 'WORK IN SILENCE - Motivational Compilation', channel: 'Team Fearless', duration: 1920 },
    { id: 'h8', youtubeId: 'zzfREEPbUsA', title: 'STUDY HARD - Academic Motivation', channel: 'Motivation2Study', duration: 1800 },
  ],
  Confidence: [
    { id: 'cf1', youtubeId: 'FTnCMxN_JCY', title: 'BELIEVE IN YOURSELF - Motivational Speech', channel: 'Motiversity', duration: 1800 },
    { id: 'cf2', youtubeId: 'w-HYZv6HzAs', title: 'SELF CONFIDENCE - Powerful Motivation', channel: 'MotivationHub', duration: 1920 },
    { id: 'cf3', youtubeId: 'sPaJTS33Qzc', title: 'KNOW YOUR WORTH - Motivational Video', channel: 'Motiversity', duration: 2100 },
    { id: 'cf4', youtubeId: 'lq_BvBpVeG8', title: 'OWN YOUR POWER - Motivational Speech', channel: 'Motiversity', duration: 1680 },
    { id: 'cf5', youtubeId: 'YLgNKMq9HBg', title: 'CONFIDENCE - Best Motivational Speech', channel: 'Ben Lionel Scott', duration: 1860 },
    { id: 'cf6', youtubeId: '3P4_E3GhUv8', title: 'YOU ARE ENOUGH - Powerful Motivational Video', channel: 'Be Inspired', duration: 2040 },
    { id: 'cf7', youtubeId: 'R9eVbgVfbEM', title: 'UNSHAKEABLE CONFIDENCE - Motivational Speech', channel: 'Fearless Soul', duration: 1800 },
    { id: 'cf8', youtubeId: '6vuetQSwFW8', title: 'BELIEVE IN YOURSELF - Study Motivation', channel: 'Motivation2Study', duration: 1740 },
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

  // No API key - use fallback videos (shuffle with seed if requested)
  if (!YOUTUBE_API_KEY) {
    let fallback = FALLBACK_VIDEOS[topic] || FALLBACK_VIDEOS['Discipline']
    if (shuffle && seedParam) {
      const seed = parseInt(seedParam, 10) || Date.now()
      // Seeded shuffle for fallback videos
      fallback = [...fallback]
      for (let i = fallback.length - 1; i > 0; i--) {
        const x = Math.sin(seed + i) * 10000
        const j = Math.floor((x - Math.floor(x)) * (i + 1))
        ;[fallback[i], fallback[j]] = [fallback[j], fallback[i]]
      }
    }
    return NextResponse.json({
      videos: fallback,
      topic,
      fallback: true,
    })
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
