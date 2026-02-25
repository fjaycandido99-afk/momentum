import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VOICE_SCRIPTS, DAY_TYPE_VOICE_SCRIPTS } from '@/lib/daily-guide/voice-scripts'
import { generateAudio, getSharedCached, setSharedCache, getMonthlyUsage, MONTHLY_CREDIT_LIMIT } from '@/lib/daily-guide/audio-utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Default tone for library generation
const DEFAULT_TONE = 'calm'

// Build library cache key: library-{type}-s{index}-{tone}
function getLibraryCacheKey(type: string, index: number, tone: string): string {
  return `library-${type}-s${index}-${tone}`
}

// Build unified list of all script types (regular + day-type)
function getAllScriptTypes(): { type: string; scripts: string[] }[] {
  const all: { type: string; scripts: string[] }[] = []
  for (const [type, scripts] of Object.entries(VOICE_SCRIPTS)) {
    all.push({ type, scripts })
  }
  for (const [type, scripts] of Object.entries(DAY_TYPE_VOICE_SCRIPTS)) {
    all.push({ type, scripts })
  }
  return all
}

// POST - Batch-generate audio with round-robin + budget tracking
export async function POST(request: NextRequest) {
  try {
    // Auth: CRON_SECRET bearer token
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse optional body params
    let body: { roundRobin?: boolean; maxChars?: number; tones?: string[] } = {}
    try {
      body = await request.json()
    } catch {
      // No body or invalid JSON — use defaults
    }

    const roundRobin = body.roundRobin ?? true
    const maxChars = body.maxChars ?? MONTHLY_CREDIT_LIMIT
    const tones = body.tones ?? [DEFAULT_TONE]

    let generated = 0
    let skipped = 0
    let errors = 0
    let charsUsed = 0
    let budgetExhausted = false
    const details: { key: string; status: string; chars?: number; tone?: string }[] = []
    const coverage: Record<string, { total: number; generated: number }> = {}

    const allTypes = getAllScriptTypes()

    // Initialize coverage tracking
    for (const { type, scripts } of allTypes) {
      coverage[type] = { total: scripts.length, generated: 0 }
    }

    if (roundRobin) {
      // Round-robin: generate index 0 for ALL types, then index 1, etc.
      const maxScripts = Math.max(...allTypes.map(t => t.scripts.length))

      for (let round = 0; round < maxScripts && !budgetExhausted; round++) {
        for (const { type, scripts } of allTypes) {
          if (budgetExhausted) break
          if (round >= scripts.length) continue

          const script = scripts[round]

          for (const tone of tones) {
            if (budgetExhausted) break

            const cacheKey = getLibraryCacheKey(type, round, tone)

            // Check if already exists
            const existing = await getSharedCached(cacheKey)
            if (existing) {
              skipped++
              coverage[type].generated++
              details.push({ key: cacheKey, status: 'skipped', tone })
              continue
            }

            // Check budget before generating
            const charCount = script.length
            if (charsUsed + charCount > maxChars) {
              budgetExhausted = true
              details.push({ key: cacheKey, status: 'budget_exhausted', chars: charCount, tone })
              break
            }

            // Generate audio via ElevenLabs
            const result = await generateAudio(script, tone)

            if (result.audioBase64) {
              await setSharedCache(cacheKey, result.audioBase64, result.duration)
              generated++
              charsUsed += charCount
              coverage[type].generated++
              details.push({ key: cacheKey, status: 'generated', chars: charCount, tone })
            } else {
              errors++
              details.push({ key: cacheKey, status: 'error', chars: charCount, tone })
            }
          }
        }
      }
    } else {
      // Sequential mode (original behavior): process all scripts per type before moving to next
      for (const { type, scripts } of allTypes) {
        if (budgetExhausted) break

        for (let index = 0; index < scripts.length; index++) {
          if (budgetExhausted) break

          const script = scripts[index]

          for (const tone of tones) {
            if (budgetExhausted) break

            const cacheKey = getLibraryCacheKey(type, index, tone)

            // Check if already exists
            const existing = await getSharedCached(cacheKey)
            if (existing) {
              skipped++
              coverage[type].generated++
              details.push({ key: cacheKey, status: 'skipped', tone })
              continue
            }

            // Check budget before generating
            const charCount = script.length
            if (charsUsed + charCount > maxChars) {
              budgetExhausted = true
              details.push({ key: cacheKey, status: 'budget_exhausted', chars: charCount, tone })
              break
            }

            // Generate audio via ElevenLabs
            const result = await generateAudio(script, tone)

            if (result.audioBase64) {
              await setSharedCache(cacheKey, result.audioBase64, result.duration)
              generated++
              charsUsed += charCount
              coverage[type].generated++
              details.push({ key: cacheKey, status: 'generated', chars: charCount, tone })
            } else {
              errors++
              details.push({ key: cacheKey, status: 'error', chars: charCount, tone })
            }
          }
        }
      }
    }

    // Get monthly usage for the report
    const monthlyUsage = await getMonthlyUsage()

    console.log(`[Voice Library] Batch complete: generated=${generated}, skipped=${skipped}, errors=${errors}, charsUsed=${charsUsed}, budgetExhausted=${budgetExhausted}`)

    return NextResponse.json({
      success: true,
      generated,
      skipped,
      errors,
      total: generated + skipped + errors,
      charsUsed,
      remaining: maxChars - charsUsed,
      budgetExhausted,
      monthlyUsage,
      monthlyLimit: MONTHLY_CREDIT_LIMIT,
      mode: roundRobin ? 'round_robin' : 'sequential',
      tones,
      coverage,
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
    const coverage: Record<string, { total: number; cached: number }> = {}

    const allTypes = getAllScriptTypes()

    for (const { type, scripts } of allTypes) {
      coverage[type] = { total: scripts.length, cached: 0 }

      for (let index = 0; index < scripts.length; index++) {
        const cacheKey = getLibraryCacheKey(type, index, tone)
        const cached = await getSharedCached(cacheKey)
        const exists = !!cached
        entries.push({ key: cacheKey, exists })
        total++
        if (exists) {
          existing++
          coverage[type].cached++
        }
      }
    }

    // Get monthly usage
    const monthlyUsage = await getMonthlyUsage()

    return NextResponse.json({
      total,
      existing,
      missing: total - existing,
      complete: existing === total,
      monthlyUsage,
      monthlyLimit: MONTHLY_CREDIT_LIMIT,
      coverage,
      entries,
    })
  } catch (error) {
    console.error('[Voice Library] Status check error:', error)
    return NextResponse.json({ error: 'Failed to check library status' }, { status: 500 })
  }
}
