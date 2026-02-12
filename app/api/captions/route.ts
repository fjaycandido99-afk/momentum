import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Fetch YouTube auto-generated captions
export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId')

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 })
  }

  try {
    // Try to get captions from YouTube's timedtext API
    const captionUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`
    const response = await fetch(captionUrl)

    if (!response.ok) {
      // Try alternative method - fetch video page and extract captions
      const captions = await fetchCaptionsFromPage(videoId)
      if (captions) {
        return NextResponse.json({ captions })
      }
      return NextResponse.json({ error: 'No captions available' }, { status: 404 })
    }

    const xml = await response.text()
    const captions = parseTimedText(xml)

    return NextResponse.json({ captions })
  } catch (error) {
    console.error('Caption fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch captions' }, { status: 500 })
  }
}

// Parse YouTube's timedtext XML format
function parseTimedText(xml: string): { start: number; dur: number; text: string }[] {
  const captions: { start: number; dur: number; text: string }[] = []

  // Simple regex parsing for <text start="X" dur="Y">content</text>
  const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g
  let match

  while ((match = regex.exec(xml)) !== null) {
    captions.push({
      start: parseFloat(match[1]),
      dur: parseFloat(match[2]),
      text: decodeHTMLEntities(match[3]),
    })
  }

  return captions
}

// Decode HTML entities
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n/g, ' ')
    .trim()
}

// Alternative: fetch captions from video page
async function fetchCaptionsFromPage(videoId: string): Promise<{ start: number; dur: number; text: string }[] | null> {
  try {
    // Fetch the video page
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!pageResponse.ok) return null

    const html = await pageResponse.text()

    // Look for captions in the page data
    const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/)
    if (!captionMatch) return null

    const captionTracks = JSON.parse(captionMatch[1])
    const englishTrack = captionTracks.find((t: { languageCode: string }) =>
      t.languageCode === 'en' || t.languageCode?.startsWith('en')
    )

    if (!englishTrack?.baseUrl) return null

    // Fetch the actual caption file
    const captionResponse = await fetch(englishTrack.baseUrl)
    if (!captionResponse.ok) return null

    const captionXml = await captionResponse.text()
    return parseTimedText(captionXml)
  } catch {
    return null
  }
}
