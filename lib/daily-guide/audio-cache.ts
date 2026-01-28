// Audio cache with DB persistence for Vercel serverless
// Uses AudioCache model for shared audio (keyed by segment+tone, reused across all users)
// Per-user per-day audio is stored on the DailyGuide model directly

import { prisma } from '@/lib/prisma'
import type { GuideSegment } from './day-type'

export interface CachedGuideAudio {
  script: string
  audioBase64: string
  duration: number
  createdAt: string
}

function getCacheKey(userId: string, date: string, segment: GuideSegment): string {
  return `daily-${userId}-${date}-${segment}`
}

export async function getCachedAudio(
  userId: string,
  date: string,
  segment: GuideSegment
): Promise<CachedGuideAudio | null> {
  const cacheKey = getCacheKey(userId, date, segment)
  try {
    const cached = await prisma.audioCache.findUnique({
      where: { cache_key: cacheKey },
    })
    if (cached) {
      return {
        script: '',
        audioBase64: cached.audio,
        duration: cached.duration,
        createdAt: cached.created_at.toISOString(),
      }
    }
  } catch (e) {
    console.error('[Daily Guide Cache] DB read error:', e)
  }
  return null
}

export async function setCachedAudio(
  userId: string,
  date: string,
  segment: GuideSegment,
  script: string,
  audioBase64: string,
  duration: number
): Promise<void> {
  const cacheKey = getCacheKey(userId, date, segment)
  try {
    await prisma.audioCache.upsert({
      where: { cache_key: cacheKey },
      update: { audio: audioBase64, duration },
      create: { cache_key: cacheKey, audio: audioBase64, duration },
    })
    console.log(`[Daily Guide Cache SET] Saved audio for ${cacheKey}`)
  } catch (e) {
    console.error('[Daily Guide Cache] DB write error:', e)
  }
}

export async function hasCachedAudio(
  userId: string,
  date: string,
  segment: GuideSegment
): Promise<boolean> {
  const cacheKey = getCacheKey(userId, date, segment)
  try {
    const cached = await prisma.audioCache.findUnique({
      where: { cache_key: cacheKey },
      select: { id: true },
    })
    return !!cached
  } catch {
    return false
  }
}

// Voice ID mapping by guide tone
const TONE_VOICES: Record<string, string> = {
  calm: 'XB0fDUnXU5powFXDhCwa',     // Charlotte - calm and soothing
  neutral: 'uju3wxzG5OhpWcoi3SMy',   // Neutral voice
  direct: 'goT3UYdM9bhm0n2lmKQx',   // Direct voice
}

// DB-backed shared cache for pre-written voice scripts
async function getSharedCached(cacheKey: string): Promise<{ audioBase64: string; duration: number } | null> {
  try {
    const cached = await prisma.audioCache.findUnique({
      where: { cache_key: cacheKey },
    })
    if (cached) {
      return { audioBase64: cached.audio, duration: cached.duration }
    }
  } catch (e) {
    console.error('[Shared Audio Cache] DB read error:', e)
  }
  return null
}

async function setSharedCached(cacheKey: string, audioBase64: string, duration: number) {
  try {
    await prisma.audioCache.upsert({
      where: { cache_key: cacheKey },
      update: { audio: audioBase64, duration },
      create: { cache_key: cacheKey, audio: audioBase64, duration },
    })
    console.log(`[Shared Audio Cache SET] ${cacheKey}`)
  } catch (e) {
    console.error('[Shared Audio Cache] DB write error:', e)
  }
}

export async function generateAndCacheAudio(
  script: string,
  segment: GuideSegment,
  tone: string = 'calm'
): Promise<{ audioBase64: string; duration: number } | null> {
  // Check shared cache first — keyed by segment+tone, reused forever
  const sharedKey = `segment-${segment}-${tone}`
  const shared = await getSharedCached(sharedKey)
  if (shared) {
    console.log(`[Shared Audio Cache HIT] ${sharedKey}`)
    return shared
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.error('[ElevenLabs Error] No API key found')
    return null
  }

  const voiceId = TONE_VOICES[tone] || TONE_VOICES.calm

  try {
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
          },
        }),
      }
    )

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text()
      console.error(`[ElevenLabs Error] Status: ${ttsResponse.status}, Response: ${errorText}`)
      return null
    }

    const audioBuffer = await ttsResponse.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    // Estimate duration based on script length
    // Average speaking pace: ~150 words per minute, ~5 chars per word
    const wordCount = script.split(/\s+/).length
    const estimatedDuration = Math.ceil((wordCount / 150) * 60)

    const result = { audioBase64, duration: estimatedDuration }

    // Save to shared cache so it's never regenerated
    await setSharedCached(sharedKey, audioBase64, estimatedDuration)

    return result
  } catch (error) {
    console.error('[ElevenLabs Error]', error)
    return null
  }
}
