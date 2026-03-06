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
    { id: 'lf5', youtubeId: 'jfKfPfyJRdk', title: 'Lofi Hip Hop Radio - Beats to Relax/Study To', channel: 'Lofi Girl', duration: 0 },
    { id: 'lf6', youtubeId: '4xDzrJKXOOY', title: 'Synthwave Radio - Beats to Chill/Game To', channel: 'Lofi Girl', duration: 0 },
    { id: 'lf7', youtubeId: 'TURbeWK2wwg', title: 'Lofi Coding Music - Chill Beats for Programming', channel: 'Lofi Geek', duration: 7200 },
    { id: 'lf8', youtubeId: '7NOSDKb0HlU', title: 'Lofi Beats - Chill Vibes to Relax', channel: 'The Bootleg Boy', duration: 10800 },
    { id: 'lf9', youtubeId: 'DWcJFNfaw9c', title: 'Lofi Hip Hop Mix - Jazzy Vibes', channel: 'Chillhop Music', duration: 3600 },
    { id: 'lf10', youtubeId: '5yx6BWlEVcY', title: 'Coffee Shop Radio - 24/7 Lofi Hip Hop', channel: 'STEEZYASFUCK', duration: 0 },
  ],
  piano: [
    { id: 'pn1', youtubeId: 'HSOtku1j600', title: 'Beautiful Piano Music - Relaxing Music for Sleep', channel: 'Soothing Relaxation', duration: 10800 },
    { id: 'pn2', youtubeId: 'lCOF9LN_Zxs', title: 'Peaceful Piano Music - Study Music', channel: 'Relaxing Records', duration: 7200 },
    { id: 'pn3', youtubeId: '77ZozI0rw7w', title: 'Soft Piano Music - Calm Piano for Relaxation', channel: 'Soothing Relaxation', duration: 10800 },
    { id: 'pn4', youtubeId: 'XULUBg_ZcAI', title: 'Beautiful Piano Music 24/7 - Study & Relax', channel: 'BGM Channel', duration: 0 },
    { id: 'pn5', youtubeId: 'fGdp3IkmFBc', title: 'Relaxing Piano Music - Romantic Music', channel: 'OCB Relax Music', duration: 10800 },
    { id: 'pn6', youtubeId: 'sY8DnPgWfFo', title: 'Piano Covers of Popular Songs - Relaxing Instrumental', channel: 'Instrumental Covers', duration: 7200 },
    { id: 'pn7', youtubeId: 'JWA5hJl4Dv0', title: 'Beautiful Piano Pieces - Classical Calm', channel: 'HALIDONMUSIC', duration: 10800 },
    { id: 'pn8', youtubeId: '0hBDi3Z7PEE', title: 'Sad Piano Music - Emotional & Beautiful', channel: 'Purple Cat', duration: 3600 },
  ],
  jazz: [
    { id: 'jz1', youtubeId: 'Dx5qFachd3A', title: 'Relaxing Jazz Music - Coffee Shop Ambience', channel: 'Cafe Music BGM', duration: 10800 },
    { id: 'jz2', youtubeId: 'fEvM-OUbaKs', title: 'Smooth Jazz Music - Relaxing Jazz', channel: 'Dr. SaxLove', duration: 7200 },
    { id: 'jz3', youtubeId: 'DSGyEsJ17cI', title: 'Jazz & Bossa Nova - Relaxing Cafe Music', channel: 'Cafe Music BGM', duration: 10800 },
    { id: 'jz4', youtubeId: 'mDFBTdToRmw', title: 'Late Night Jazz - Smooth Saxophone', channel: 'Dr. SaxLove', duration: 7200 },
    { id: 'jz5', youtubeId: 'VMAPTo7RVCo', title: 'Jazz Piano Coffee - Cozy Cafe Ambience', channel: 'Relax Jazz Cafe', duration: 10800 },
    { id: 'jz6', youtubeId: 'neV3EPgvZ3g', title: 'Morning Jazz - Wake Up Happy with Jazz Music', channel: 'Relax Music', duration: 10800 },
    { id: 'jz7', youtubeId: 'HwfOIYpJlZ0', title: 'Jazz Lounge Music - Smooth Background Jazz', channel: 'Jazz and Blues Experience', duration: 7200 },
    { id: 'jz8', youtubeId: 'y0d9rXAf2Nk', title: 'Cozy Coffee Shop Jazz - Warm Jazz Piano', channel: 'Cafe Music BGM', duration: 10800 },
  ],
  classical: [
    { id: 'cl1', youtubeId: 'mIYzp5rcTvU', title: 'Classical Music for Studying and Concentration', channel: 'HALIDONMUSIC', duration: 10800 },
    { id: 'cl2', youtubeId: 'jgpJVI3tDbY', title: 'Classical Music for Brain Power', channel: 'HALIDONMUSIC', duration: 10800 },
    { id: 'cl3', youtubeId: 'WJ3-F02-F_Y', title: 'Classical Music for Reading - Mozart, Chopin', channel: 'HALIDONMUSIC', duration: 10800 },
    { id: 'cl4', youtubeId: 'Rb0UmrCXxVA', title: 'Beautiful Classical Music - Best of Mozart', channel: 'HALIDONMUSIC', duration: 7200 },
    { id: 'cl5', youtubeId: 'tT9gT5bqi6Y', title: 'Baroque Music for Studying - Vivaldi, Bach', channel: 'HALIDONMUSIC', duration: 10800 },
    { id: 'cl6', youtubeId: 'Z2S_JZ3lXkQ', title: 'Classical Music for Working - Productive Focus', channel: 'Just Instrumental Music', duration: 7200 },
    { id: 'cl7', youtubeId: 'GNkGIiE0PFQ', title: 'Best of Chopin - Nocturnes & Waltzes', channel: 'HALIDONMUSIC', duration: 10800 },
    { id: 'cl8', youtubeId: 'EhO_MrRfftU', title: 'Debussy, Ravel, Satie - Relaxing Classical Piano', channel: 'HALIDONMUSIC', duration: 7200 },
  ],
  ambient: [
    { id: 'am1', youtubeId: 'S_MOd40zlYU', title: 'Ambient Music for Focus and Creativity', channel: 'Greenred Productions', duration: 10800 },
    { id: 'am2', youtubeId: 'hHW1oY26kxQ', title: 'Deep Focus Music - Ambient Music for Studying', channel: 'Quiet Quest', duration: 7200 },
    { id: 'am3', youtubeId: 'lE6RYpe9IT0', title: 'Relaxing Ambient Music - Ethereal Background', channel: 'Ambient Worlds', duration: 10800 },
    { id: 'am4', youtubeId: 'FjHGZj2IjBk', title: 'Space Ambient Music - Cosmic Relaxation', channel: 'Ambient Worlds', duration: 7200 },
    { id: 'am5', youtubeId: 'C_VXj0czOJE', title: 'Atmospheric Ambient - Deep Meditation', channel: 'Yellow Brick Cinema', duration: 10800 },
    { id: 'am6', youtubeId: 'WYp9Eo71JZ0', title: 'Ambient Music for Sleeping - Dreamy Soundscapes', channel: 'Soothing Relaxation', duration: 10800 },
    { id: 'am7', youtubeId: '7cY5-5_Fk3k', title: 'Dark Ambient Music - Deep Atmosphere', channel: 'Cryo Chamber', duration: 7200 },
    { id: 'am8', youtubeId: '3PX_JMOwCEE', title: 'Ambient Music for Thinking - Calm Background', channel: 'Greenred Productions', duration: 10800 },
  ],
  study: [
    { id: 'st1', youtubeId: 'sjkrrmBnpGE', title: 'Study Music Alpha Waves - Focus Music', channel: 'Greenred Productions', duration: 10800 },
    { id: 'st2', youtubeId: 'lTRiuFIWV54', title: 'Study Music - Deep Focus Music for Concentration', channel: 'Yellow Brick Cinema', duration: 10800 },
    { id: 'st3', youtubeId: 'oPVte6aMprI', title: 'Deep Focus - Music For Studying', channel: 'Quiet Quest', duration: 7200 },
    { id: 'st4', youtubeId: 'co_DNpTMKXk', title: 'Study Music - Concentration Music for Work', channel: 'Greenred Productions', duration: 10800 },
    { id: 'st5', youtubeId: 'x7_-C2mEuXQ', title: '4 Hours of Study Music - Focus & Productivity', channel: 'Greenred Productions', duration: 14400 },
    { id: 'st6', youtubeId: 'DcJFdCmN98s', title: 'Super Intelligence Music - Focus Frequency', channel: 'Greenred Productions', duration: 10800 },
    { id: 'st7', youtubeId: 'nR2lONTmkpo', title: 'Study Music for Concentration - Instrumental Mix', channel: 'Just Instrumental Music', duration: 7200 },
    { id: 'st8', youtubeId: '1fueZCTYkpA', title: 'Deep Work Music - Flow State Focus', channel: 'Quiet Quest', duration: 10800 },
  ],
  sleep: [
    { id: 'sl1', youtubeId: '1ZYbU82GVz4', title: 'Deep Sleep Music - Relaxing Music for Sleeping', channel: 'Soothing Relaxation', duration: 10800 },
    { id: 'sl2', youtubeId: 'aXItOY0sLRY', title: 'Sleep Music - Calming Sleep Sounds', channel: 'Yellow Brick Cinema', duration: 10800 },
    { id: 'sl3', youtubeId: 'rvaqPPjtxng', title: 'Relaxing Sleep Music - Deep Sleeping Music', channel: 'Quiet Quest', duration: 7200 },
    { id: 'sl4', youtubeId: 'hlWiI4xVXKY', title: 'Sleep Meditation Music - Peaceful Night', channel: 'Meditation Relax Music', duration: 7200 },
    { id: 'sl5', youtubeId: '2OEL4P1Rz04', title: '10 Hours Sleep Music - Calm Piano & Strings', channel: 'Soothing Relaxation', duration: 36000 },
    { id: 'sl6', youtubeId: 'qYnA9wWFHLI', title: 'Peaceful Sleep Music - Beautiful Deep Sleep', channel: 'Soothing Relaxation', duration: 10800 },
    { id: 'sl7', youtubeId: '77ZozI0rw7w', title: 'Calming Sleep Music - Piano Music for Rest', channel: 'Soothing Relaxation', duration: 10800 },
    { id: 'sl8', youtubeId: 'tz82xbLvK_k', title: 'Sleep Instantly - Healing Sleep Music', channel: 'Jason Stephenson', duration: 10800 },
  ],
}

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

  // No API key - use fallback videos (shuffle with seed if requested)
  if (!YOUTUBE_API_KEY) {
    let fallback = FALLBACK_MUSIC[genre] || FALLBACK_MUSIC['lofi']
    if (shuffle && seedParam) {
      const seed = parseInt(seedParam, 10) || Date.now()
      fallback = [...fallback]
      for (let i = fallback.length - 1; i > 0; i--) {
        const x = Math.sin(seed + i) * 10000
        const j = Math.floor((x - Math.floor(x)) * (i + 1))
        ;[fallback[i], fallback[j]] = [fallback[j], fallback[i]]
      }
    }
    return NextResponse.json({
      videos: fallback,
      genre,
      todaysGenre: getTodaysGenre(),
      fallback: true,
    })
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
