/**
 * Seed 5 NEW bedtime stories (index 5-9) in ALL tones.
 * Usage: npx tsx scripts/seed-new-bedtime.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { BEDTIME_STORIES } from '../lib/daily-guide/bedtime-scripts'

const prisma = new PrismaClient()

const VOICES: Record<string, string> = {
  calm: 'jguI6DAHl2kb9EpGEjEx',
  neutral: 'flHkNRp1BlvT73UL6gyz',
  direct: 'goT3UYdM9bhm0n2lmKQx',
}

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY
if (!ELEVENLABS_KEY) { console.error('Missing ELEVENLABS_API_KEY'); process.exit(1) }

async function generateAudio(text: string, voiceId: string): Promise<{ base64: string; duration: number } | null> {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_KEY! },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.65, similarity_boost: 0.80, speed: 0.9 },
      }),
    })
    if (!res.ok) { console.error(`  ElevenLabs ${res.status}: ${(await res.text()).substring(0, 200)}`); return null }
    const buf = await res.arrayBuffer()
    const base64 = Buffer.from(buf).toString('base64')
    const duration = Math.ceil((text.split(/\s+/).length / 150) * 60)
    return { base64, duration }
  } catch (e: any) { console.error(`  Error: ${e.message}`); return null }
}

async function seed() {
  // Only seed stories 5-9 (the new ones)
  const newStories = BEDTIME_STORIES.slice(5)
  console.log(`Seeding ${newStories.length} new bedtime stories in ${Object.keys(VOICES).length} tones (${newStories.length * Object.keys(VOICES).length} total)...\n`)

  let generated = 0
  let skipped = 0

  for (const [tone, voiceId] of Object.entries(VOICES)) {
    console.log(`\n=== ${tone.toUpperCase()} ===`)
    for (let i = 0; i < newStories.length; i++) {
      const storyIndex = i + 5 // offset since these are stories 5-9
      const cacheKey = `library-bedtime_story-s${storyIndex}-${tone}`

      const existing = await prisma.audioCache.findUnique({ where: { cache_key: cacheKey }, select: { id: true } })
      if (existing) { console.log(`SKIP ${cacheKey}`); skipped++; continue }

      console.log(`GEN  ${cacheKey} (${newStories[i].length} chars)...`)
      const result = await generateAudio(newStories[i], voiceId)
      if (!result) { console.log(`FAIL ${cacheKey}`); continue }

      await prisma.audioCache.create({
        data: { cache_key: cacheKey, audio: result.base64, duration: result.duration },
      })
      generated++
      console.log(`OK   ${cacheKey} (${result.duration}s, ${Math.round(result.base64.length / 1024)}KB)`)

      await new Promise(r => setTimeout(r, 2000))
    }
  }

  console.log(`\n--- Done! Generated: ${generated}, Skipped: ${skipped} ---`)
  await prisma.$disconnect()
}

seed().catch(e => { console.error('Failed:', e); process.exit(1) })
