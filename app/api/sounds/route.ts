import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Freesound.org API - free sounds with attribution
// Get your free API key at: https://freesound.org/apiv2/apply/

const FREESOUND_API_KEY = process.env.FREESOUND_API_KEY

interface FreesoundResult {
  id: number
  name: string
  duration: number
  previews: {
    'preview-hq-mp3': string
    'preview-lq-mp3': string
  }
  username: string
  tags: string[]
}

// Predefined searches for calming sounds
const SOUND_CATEGORIES = {
  rain: 'rain ambient loop',
  ocean: 'ocean waves ambient',
  forest: 'forest birds ambient',
  fire: 'fireplace crackling loop',
  wind: 'wind ambient nature',
  thunder: 'thunder rain storm',
  night: 'night crickets ambient',
  stream: 'stream water flowing',
  cafe: 'coffee shop ambient',
  piano: 'piano calm relaxing',
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') || 'rain'
  const searchQuery = SOUND_CATEGORIES[category as keyof typeof SOUND_CATEGORIES] || category

  if (!FREESOUND_API_KEY) {
    // Return fallback YouTube IDs if no API key
    return NextResponse.json({
      fallback: true,
      message: 'Add FREESOUND_API_KEY to .env for free audio',
      sounds: getFallbackSounds(category),
    })
  }

  try {
    const response = await fetch(
      `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(searchQuery)}&filter=duration:[30 TO 600]&fields=id,name,duration,previews,username,tags&page_size=10&token=${FREESOUND_API_KEY}`
    )

    if (!response.ok) {
      throw new Error('Freesound API error')
    }

    const data = await response.json()

    const sounds = data.results.map((sound: FreesoundResult) => ({
      id: sound.id,
      name: sound.name,
      duration: Math.round(sound.duration),
      audioUrl: sound.previews['preview-hq-mp3'],
      author: sound.username,
      tags: sound.tags.slice(0, 5),
    }))

    return NextResponse.json({ sounds, category })
  } catch (error) {
    console.error('Freesound error:', error)
    return NextResponse.json({
      fallback: true,
      sounds: getFallbackSounds(category),
    })
  }
}

// Fallback to YouTube if no API key
function getFallbackSounds(category: string) {
  const fallbacks: Record<string, { youtubeId: string; name: string }> = {
    rain: { youtubeId: 'mPZkdNFkNps', name: 'Rain Sounds' },
    ocean: { youtubeId: 'WHPEKLQID4U', name: 'Ocean Waves' },
    forest: { youtubeId: 'xNN7iTA57jM', name: 'Forest Ambience' },
    fire: { youtubeId: 'UgHKb_7884o', name: 'Crackling Fireplace' },
    wind: { youtubeId: '2dDuMb8XWTA', name: 'Wind Sounds' },
    thunder: { youtubeId: 'nDq6TstdEi8', name: 'Thunderstorm' },
    night: { youtubeId: 'NgHhs3B1xnc', name: 'Night Ambience' },
    stream: { youtubeId: 'IvjMgVS6kng', name: 'Stream Water' },
    cafe: { youtubeId: 'gaGrHUekGrc', name: 'Coffee Shop' },
    piano: { youtubeId: '77ZozI0rw7w', name: 'Calm Piano' },
  }
  return fallbacks[category] || fallbacks.rain
}
