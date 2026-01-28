import { NextRequest, NextResponse } from 'next/server'
import { getCachedVideos, setCachedVideos } from '@/lib/video-cache'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// Fallback music videos when YouTube API quota is exceeded
const FALLBACK_MUSIC: Record<string, Array<{
  id: string
  youtubeId: string
  title: string
  channel: string
  duration: number
}>> = {
  lofi: [
    { id: 'lf1', youtubeId: 'lTRiuFIWV54', title: 'Lofi Hip Hop Radio - Beats to Relax/Study', channel: 'Yellow Brick Cinema', duration: 10800 },
    { id: 'lf2', youtubeId: 'rUxyKA_-grg', title: 'Lofi Chill Music - Beats to Relax', channel: 'Chillhop Music', duration: 3600 },
    { id: 'lf3', youtubeId: 'n61ULEU7CO0', title: 'Lofi Hip Hop Mix - Beats to Study/Chill To', channel: 'Lofi Geek', duration: 7200 },
    { id: 'lf4', youtubeId: 'kgx4WGK0oNU', title: 'Lofi Hip Hop Radio - Chill Study Beats', channel: 'ChilledCow', duration: 3600 },
  ],
  piano: [
    { id: 'pn1', youtubeId: 'HSOtku1j600', title: 'Beautiful Piano Music - Relaxing Music for Sleep', channel: 'Soothing Relaxation', duration: 10800 },
    { id: 'pn2', youtubeId: 'lCOF9LN_Zxs', title: 'Peaceful Piano Music - Study Music', channel: 'Relaxing Records', duration: 7200 },
  ],
  jazz: [
    { id: 'jz1', youtubeId: 'Dx5qFachd3A', title: 'Relaxing Jazz Music - Coffee Shop Ambience', channel: 'Cafe Music BGM', duration: 10800 },
    { id: 'jz2', youtubeId: 'fEvM-OUbaKs', title: 'Smooth Jazz Music - Relaxing Jazz', channel: 'Dr. SaxLove', duration: 7200 },
  ],
  classical: [
    { id: 'cl1', youtubeId: 'mIYzp5rcTvU', title: 'Classical Music for Studying and Concentration', channel: 'HALIDONMUSIC', duration: 10800 },
    { id: 'cl2', youtubeId: 'jgpJVI3tDbY', title: 'Classical Music for Brain Power', channel: 'HALIDONMUSIC', duration: 10800 },
  ],
  ambient: [
    { id: 'am1', youtubeId: 'S_MOd40zlYU', title: 'Ambient Music for Focus and Creativity', channel: 'Greenred Productions', duration: 10800 },
    { id: 'am2', youtubeId: 'hHW1oY26kxQ', title: 'Deep Focus Music - Ambient Music for Studying', channel: 'Quiet Quest', duration: 7200 },
  ],
  study: [
    { id: 'st1', youtubeId: 'sjkrrmBnpGE', title: 'Study Music Alpha Waves - Focus Music', channel: 'Greenred Productions', duration: 10800 },
    { id: 'st2', youtubeId: 'lTRiuFIWV54', title: 'Study Music - Deep Focus Music for Concentration', channel: 'Yellow Brick Cinema', duration: 10800 },
  ],
}

// Search keywords for each music genre
const GENRE_SEARCHES: Record<string, string[]> = {
  lofi: ['lofi hip hop beats', 'lofi study music', 'lofi chill beats', 'lofi relaxing music'],
  piano: ['relaxing piano music', 'peaceful piano', 'piano study music', 'calm piano instrumental'],
  jazz: ['smooth jazz music', 'relaxing jazz', 'jazz cafe music', 'jazz instrumental'],
  classical: ['classical music relaxing', 'classical study music', 'peaceful classical', 'classical piano'],
  ambient: ['ambient music relaxing', 'ambient study music', 'ambient background music', 'ambient meditation'],
  study: ['study music concentration', 'focus music', 'deep focus music', 'study with me music'],
}

// Daily genre rotation order
const GENRE_ORDER = ['lofi', 'piano', 'jazz', 'classical', 'ambient', 'study']

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const genre = searchParams.get('genre') || getTodaysGenre()

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

  // No API key - use fallback videos
  if (!YOUTUBE_API_KEY) {
    const fallback = FALLBACK_MUSIC[genre] || FALLBACK_MUSIC['lofi']
    return NextResponse.json({
      videos: fallback,
      genre,
      todaysGenre: getTodaysGenre(),
      fallback: true,
    })
  }

  const searchTerms = GENRE_SEARCHES[genre] || GENRE_SEARCHES['lofi']
  const randomSearch = searchTerms[Math.floor(Math.random() * searchTerms.length)]

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
      // Return fallback videos on API error
      const fallback = FALLBACK_MUSIC[genre] || FALLBACK_MUSIC['lofi']
      await setCachedVideos('music', genre, fallback)
      return NextResponse.json({
        videos: fallback,
        genre,
        todaysGenre: getTodaysGenre(),
        fallback: true,
      })
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
        thumbnail: video.snippet.thumbnails?.high?.url ||
                   video.snippet.thumbnails?.medium?.url ||
                   `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`,
        duration,
      })
    }

    // Return up to 10 videos and cache them
    const finalVideos = videos.slice(0, 10)

    if (finalVideos.length > 0) {
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
    // Return fallback videos on error
    const fallback = FALLBACK_MUSIC[genre] || FALLBACK_MUSIC['lofi']
    setCachedVideos('music', genre, fallback)
    return NextResponse.json({
      videos: fallback,
      genre,
      todaysGenre: getTodaysGenre(),
      fallback: true,
    })
  }
}
