/**
 * Seed the 5 bedtime stories in calm tone.
 * Usage: npx tsx scripts/seed-bedtime-calm.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { BEDTIME_STORIES } from '../lib/daily-guide/bedtime-scripts'

const prisma = new PrismaClient()

const CALM_VOICE_ID = 'jguI6DAHl2kb9EpGEjEx'
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY

if (!ELEVENLABS_KEY) {
  console.error('Missing ELEVENLABS_API_KEY')
  process.exit(1)
}

async function generateAudio(text: string): Promise<{ base64: string; duration: number } | null> {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${CALM_VOICE_ID}`, {
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
    console.error(`  Error: ${e.message}`)
    return null
  }
}

async function seed() {
  console.log(`Seeding ${BEDTIME_STORIES.length} bedtime stories in calm tone...\n`)

  let generated = 0

  for (let i = 0; i < BEDTIME_STORIES.length; i++) {
    const cacheKey = `library-bedtime_story-s${i}-calm`

    const existing = await prisma.audioCache.findUnique({
      where: { cache_key: cacheKey },
      select: { id: true },
    })

    if (existing) {
      console.log(`SKIP ${cacheKey} (already cached)`)
      continue
    }

    console.log(`GEN  ${cacheKey} (${BEDTIME_STORIES[i].length} chars)...`)

    const result = await generateAudio(BEDTIME_STORIES[i])
    if (!result) {
      console.log(`FAIL ${cacheKey}`)
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
    console.log(`OK   ${cacheKey} (${result.duration}s, ${Math.round(result.base64.length / 1024)}KB)`)

    // Rate limit
    await new Promise(r => setTimeout(r, 2000))
  }

  console.log(`\nDone! Generated ${generated} bedtime stories in calm tone.`)
  await prisma.$disconnect()
}

seed().catch(e => {
  console.error('Failed:', e)
  process.exit(1)
})
