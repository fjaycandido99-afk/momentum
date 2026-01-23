// Script to fetch and verify embeddable motivational videos
// Run with: npx ts-node scripts/fetch-motivation-videos.ts

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

// Channels known to allow embedding
const MOTIVATION_CHANNELS = [
  { id: 'UCAPByrKfwEJjJKfS9dN5Vww', name: 'Motiversity' },
  { id: 'UCMTk_R_Y49jvq-HQXDmKI0Q', name: 'MotivationHub' },
  { id: 'UC8bYucAICXmYet8pZ5Ja48g', name: 'JEREMEY ANDERSON' },
  { id: 'UCqPgxwDcUsFB9qqXPxMNqNw', name: 'Absolute Motivation' },
  { id: 'UCOgldZ39BfULNxHKZ9bLP1A', name: 'Your World Within' },
  { id: 'UCfAOaM8vy8BSEd6JL4wdKiw', name: 'After Skool' },
]

// Search keywords for each topic
const TOPIC_KEYWORDS: Record<string, string[]> = {
  Discipline: ['discipline motivation', 'self discipline speech', 'discipline equals freedom'],
  Focus: ['focus motivation', 'eliminate distractions', 'deep focus mindset'],
  Mindset: ['mindset motivation', 'growth mindset', 'winning mindset speech'],
  Courage: ['courage motivation', 'face your fears', 'be brave speech'],
  Resilience: ['resilience motivation', 'never give up', 'keep going speech'],
  Hustle: ['work hard motivation', 'grind motivation', 'outwork everyone'],
  Confidence: ['confidence motivation', 'believe in yourself', 'self belief speech'],
}

interface Video {
  id: string
  title: string
  youtubeId: string
  channel: string
  embeddable: boolean
}

async function searchVideos(query: string, maxResults = 10): Promise<Video[]> {
  if (!YOUTUBE_API_KEY) {
    console.error('YOUTUBE_API_KEY not set')
    return []
  }

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: maxResults.toString(),
    videoCategoryId: '22', // People & Blogs (motivation content)
    videoEmbeddable: 'true', // Only embeddable videos
    videoSyndicated: 'true', // Can be played outside YouTube
    relevanceLanguage: 'en',
    key: YOUTUBE_API_KEY,
  })

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
  const data = await response.json()

  if (!data.items) {
    console.error('No items in response:', data)
    return []
  }

  return data.items.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    youtubeId: item.id.videoId,
    channel: item.snippet.channelTitle,
    embeddable: true, // Pre-filtered by API
  }))
}

async function verifyEmbeddable(videoId: string): Promise<boolean> {
  if (!YOUTUBE_API_KEY) return false

  const params = new URLSearchParams({
    part: 'status',
    id: videoId,
    key: YOUTUBE_API_KEY,
  })

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`)
  const data = await response.json()

  if (data.items && data.items.length > 0) {
    return data.items[0].status?.embeddable === true
  }
  return false
}

async function main() {
  console.log('Fetching embeddable motivational videos...\n')

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    console.log(`\n=== ${topic} ===`)

    for (const keyword of keywords.slice(0, 1)) { // Just first keyword for now
      const videos = await searchVideos(`${keyword} motivational speech`, 5)

      for (const video of videos) {
        const isEmbeddable = await verifyEmbeddable(video.youtubeId)
        if (isEmbeddable) {
          console.log(`{ id: '${topic.toLowerCase().slice(0,1)}${Math.random().toString(36).slice(2,4)}', title: '${video.title.replace(/'/g, "\\'")}', youtubeId: '${video.youtubeId}', channel: '${video.channel}' },`)
        }
      }
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500))
  }
}

main().catch(console.error)
