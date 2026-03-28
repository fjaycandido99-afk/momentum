/**
 * Seed AudioCache with ElevenLabs-generated audio for guided voice scripts.
 *
 * Usage: npx tsx scripts/seed-audio-cache.ts
 *
 * Requires: ELEVENLABS_API_KEY in .env and DATABASE_URL env vars
 * Splits 70k credits evenly between neutral + direct tones.
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { VOICE_SCRIPTS, DAY_TYPE_VOICE_SCRIPTS } from '../lib/daily-guide/voice-scripts'
import { CALM_VOICE_SCRIPTS } from '../lib/calm-voice-scripts'

const prisma = new PrismaClient()

const TONE_VOICES: Record<string, string> = {
  calm: 'jguI6DAHl2kb9EpGEjEx',
  // neutral: 'flHkNRp1BlvT73UL6gyz',
  // direct: 'goT3UYdM9bhm0n2lmKQx',
}

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY
if (!ELEVENLABS_KEY) {
  console.error('Missing ELEVENLABS_API_KEY env var')
  process.exit(1)
}

// Max entries to generate this run
const MAX_GENERATE = 60

async function generateAudio(text: string, voiceId: string): Promise<{ base64: string; duration: number } | null> {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.80,
          speed: 0.9,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`  ElevenLabs error ${res.status}: ${err.substring(0, 200)}`)
      return null
    }

    const buf = await res.arrayBuffer()
    const base64 = Buffer.from(buf).toString('base64')
    const wordCount = text.split(/\s+/).length
    const duration = Math.ceil((wordCount / 150) * 60)

    return { base64, duration }
  } catch (e: any) {
    console.error(`  Fetch error: ${e.message}`)
    return null
  }
}

async function seed() {
  let generated = 0
  let skipped = 0
  let failed = 0

  // Collect all scripts: guided voice types + day-type voice scripts
  const allScripts: { type: string; index: number; script: string }[] = []

  const SKIP_TYPES = ['bedtime_story'] // Skip expensive long-form types
  for (const [type, scripts] of Object.entries(VOICE_SCRIPTS)) {
    if (SKIP_TYPES.includes(type)) continue
    scripts.forEach((script, index) => {
      allScripts.push({ type, index, script })
    })
  }

  for (const [type, scripts] of Object.entries(DAY_TYPE_VOICE_SCRIPTS)) {
    scripts.forEach((script, index) => {
      allScripts.push({ type, index, script })
    })
  }

  // Add calm voice scripts (anxiety, meditation, etc.)
  for (const [type, scripts] of Object.entries(CALM_VOICE_SCRIPTS)) {
    const calmType = `calm_${type}` // prefix to avoid key collision
    scripts.forEach((script, index) => {
      allScripts.push({ type: calmType, index, script })
    })
  }

  console.log(`Total scripts available: ${allScripts.length}`)
  console.log(`Total chars across all scripts: ${allScripts.reduce((s, x) => s + x.script.length, 0)}`)

  const tones = Object.entries(TONE_VOICES)

  for (const [tone, voiceId] of tones) {
    let toneCharsUsed = 0
    console.log(`\n=== Tone: ${tone} (voice: ${voiceId}) ===`)
    console.log(`Max generate: ${MAX_GENERATE} entries\n`)

    for (const { type, index, script } of allScripts) {
      // Check generation limit
      if (generated >= MAX_GENERATE) {
        console.log(`  LIMIT reached (${generated}/${MAX_GENERATE} generated). Stopping.`)
        break
      }

      const cacheKey = `library-${type}-s${index}-${tone}`

      // Check if already cached
      const existing = await prisma.audioCache.findUnique({
        where: { cache_key: cacheKey },
        select: { id: true },
      })

      if (existing) {
        console.log(`  SKIP ${cacheKey} (already cached)`)
        skipped++
        continue
      }

      console.log(`  GEN  ${cacheKey} (${script.length} chars)...`)
      toneCharsUsed += script.length

      const result = await generateAudio(script, voiceId)
      if (!result) {
        console.log(`  FAIL ${cacheKey}`)
        failed++
        continue
      }

      await prisma.audioCache.create({
        data: {
          cache_key: cacheKey,
          audio: result.base64,
          duration: result.duration,
        },
      })

      generated++
      console.log(`  OK   ${cacheKey} (${result.duration}s, ${Math.round(result.base64.length / 1024)}KB)`)

      // Rate limit: ElevenLabs allows ~3 req/s on paid plans
      await new Promise(r => setTimeout(r, 1500))
    }

    console.log(`\n  ${tone} tone: generated ${generated} entries`)
  }

  console.log(`\n--- Summary ---`)
  console.log(`Generated: ${generated}`)
  console.log(`Skipped:   ${skipped}`)
  console.log(`Failed:    ${failed}`)

  await prisma.$disconnect()
}

seed().catch(e => {
  console.error('Seed failed:', e)
  process.exit(1)
})
