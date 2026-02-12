import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VOICE_SCRIPTS, DAY_TYPE_VOICE_SCRIPTS } from '@/lib/daily-guide/voice-scripts'
import { generateAudio, getSharedCached, setSharedCache } from '@/lib/daily-guide/audio-utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Default tone for library generation
const DEFAULT_TONE = 'calm'

// Build library cache key: library-{type}-s{index}-{tone}
function getLibraryCacheKey(type: string, index: number, tone: string): string {
  return `library-${type}-s${index}-${tone}`
}

// POST - Batch-generate audio for all 65 pre-written scripts
export async function POST(request: NextRequest) {
  try {
    // Auth: CRON_SECRET bearer token
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tone = DEFAULT_TONE
    let generated = 0
    let skipped = 0
    let errors = 0
    const details: { key: string; status: string }[] = []

    // Process regular voice scripts (breathing, affirmation, gratitude, sleep, grounding)
    for (const [type, scripts] of Object.entries(VOICE_SCRIPTS)) {
      for (let index = 0; index < scripts.length; index++) {
        const cacheKey = getLibraryCacheKey(type, index, tone)

        // Check if already exists
        const existing = await getSharedCached(cacheKey)
        if (existing) {
          skipped++
          details.push({ key: cacheKey, status: 'skipped' })
          continue
        }

        // Generate audio via ElevenLabs
        const script = scripts[index]
        const result = await generateAudio(script, tone)

        if (result.audioBase64) {
          await setSharedCache(cacheKey, result.audioBase64, result.duration)
          generated++
          details.push({ key: cacheKey, status: 'generated' })
        } else {
          errors++
          details.push({ key: cacheKey, status: 'error' })
        }
      }
    }

    // Process day-type voice scripts (work_prime, off_prime, etc.)
    for (const [type, scripts] of Object.entries(DAY_TYPE_VOICE_SCRIPTS)) {
      for (let index = 0; index < scripts.length; index++) {
        const cacheKey = getLibraryCacheKey(type, index, tone)

        // Check if already exists
        const existing = await getSharedCached(cacheKey)
        if (existing) {
          skipped++
          details.push({ key: cacheKey, status: 'skipped' })
          continue
        }

        // Generate audio via ElevenLabs
        const script = scripts[index]
        const result = await generateAudio(script, tone)

        if (result.audioBase64) {
          await setSharedCache(cacheKey, result.audioBase64, result.duration)
          generated++
          details.push({ key: cacheKey, status: 'generated' })
        } else {
          errors++
          details.push({ key: cacheKey, status: 'error' })
        }
      }
    }

    console.log(`[Voice Library] Batch complete: generated=${generated}, skipped=${skipped}, errors=${errors}`)

    return NextResponse.json({
      success: true,
      generated,
      skipped,
      errors,
      total: generated + skipped + errors,
      details,
    })
  } catch (error) {
    console.error('[Voice Library] Batch generation error:', error)
    return NextResponse.json({ error: 'Failed to generate voice library' }, { status: 500 })
  }
}

// GET - Return library status (which entries exist)
export async function GET(request: NextRequest) {
  try {
    // Auth: CRON_SECRET bearer token
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tone = DEFAULT_TONE
    const entries: { key: string; exists: boolean }[] = []
    let total = 0
    let existing = 0

    // Check regular voice scripts
    for (const [type, scripts] of Object.entries(VOICE_SCRIPTS)) {
      for (let index = 0; index < scripts.length; index++) {
        const cacheKey = getLibraryCacheKey(type, index, tone)
        const cached = await getSharedCached(cacheKey)
        const exists = !!cached
        entries.push({ key: cacheKey, exists })
        total++
        if (exists) existing++
      }
    }

    // Check day-type voice scripts
    for (const [type, scripts] of Object.entries(DAY_TYPE_VOICE_SCRIPTS)) {
      for (let index = 0; index < scripts.length; index++) {
        const cacheKey = getLibraryCacheKey(type, index, tone)
        const cached = await getSharedCached(cacheKey)
        const exists = !!cached
        entries.push({ key: cacheKey, exists })
        total++
        if (exists) existing++
      }
    }

    return NextResponse.json({
      total,
      existing,
      missing: total - existing,
      complete: existing === total,
      entries,
    })
  } catch (error) {
    console.error('[Voice Library] Status check error:', error)
    return NextResponse.json({ error: 'Failed to check library status' }, { status: 500 })
  }
}
