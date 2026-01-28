import fs from 'fs'
import path from 'path'
import type { GuideSegment } from './day-type'

// File-based cache directory for persistent audio storage
const CACHE_DIR = path.join(process.cwd(), '.audio-cache', 'daily-guide')

// Shared cache — keyed by segment+tone, reused across all users and days for pre-written scripts
const SHARED_CACHE_DIR = path.join(process.cwd(), '.audio-cache', 'shared-voices')

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

export interface CachedGuideAudio {
  script: string
  audioBase64: string
  duration: number
  createdAt: string
}

function getCacheKey(userId: string, date: string, segment: GuideSegment): string {
  return `daily-${userId}-${date}-${segment}`
}

export function getCachedAudio(
  userId: string,
  date: string,
  segment: GuideSegment
): CachedGuideAudio | null {
  ensureCacheDir()
  const cacheKey = getCacheKey(userId, date, segment)
  const filePath = path.join(CACHE_DIR, `${cacheKey}.json`)

  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return data as CachedGuideAudio
    } catch {
      return null
    }
  }
  return null
}

export function setCachedAudio(
  userId: string,
  date: string,
  segment: GuideSegment,
  script: string,
  audioBase64: string,
  duration: number
): void {
  ensureCacheDir()
  const cacheKey = getCacheKey(userId, date, segment)
  const filePath = path.join(CACHE_DIR, `${cacheKey}.json`)

  const data: CachedGuideAudio = {
    script,
    audioBase64,
    duration,
    createdAt: new Date().toISOString(),
  }

  fs.writeFileSync(filePath, JSON.stringify(data))
  console.log(`[Daily Guide Cache SET] Saved audio for ${cacheKey}`)
}

export function hasCachedAudio(
  userId: string,
  date: string,
  segment: GuideSegment
): boolean {
  ensureCacheDir()
  const cacheKey = getCacheKey(userId, date, segment)
  const filePath = path.join(CACHE_DIR, `${cacheKey}.json`)
  return fs.existsSync(filePath)
}

// Voice ID mapping by guide tone
const TONE_VOICES: Record<string, string> = {
  calm: 'XB0fDUnXU5powFXDhCwa',     // Charlotte - calm and soothing
  neutral: 'uju3wxzG5OhpWcoi3SMy',   // Neutral voice
  direct: 'goT3UYdM9bhm0n2lmKQx',   // Direct voice
}

function ensureSharedCacheDir() {
  if (!fs.existsSync(SHARED_CACHE_DIR)) {
    fs.mkdirSync(SHARED_CACHE_DIR, { recursive: true })
  }
}

function getSharedCached(cacheKey: string): { audioBase64: string; duration: number } | null {
  ensureSharedCacheDir()
  const filePath = path.join(SHARED_CACHE_DIR, `${cacheKey}.json`)
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch {
      return null
    }
  }
  return null
}

function setSharedCached(cacheKey: string, audioBase64: string, duration: number) {
  ensureSharedCacheDir()
  const filePath = path.join(SHARED_CACHE_DIR, `${cacheKey}.json`)
  fs.writeFileSync(filePath, JSON.stringify({ audioBase64, duration }))
  console.log(`[Shared Audio Cache SET] ${cacheKey}`)
}

export async function generateAndCacheAudio(
  script: string,
  segment: GuideSegment,
  tone: string = 'calm'
): Promise<{ audioBase64: string; duration: number } | null> {
  // Check shared cache first — keyed by segment+tone, reused forever
  const sharedKey = `segment-${segment}-${tone}`
  const shared = getSharedCached(sharedKey)
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
    setSharedCached(sharedKey, audioBase64, estimatedDuration)

    return result
  } catch (error) {
    console.error('[ElevenLabs Error]', error)
    return null
  }
}

export function cleanOldCache(daysToKeep: number = 7): void {
  ensureCacheDir()
  const now = Date.now()
  const maxAge = daysToKeep * 24 * 60 * 60 * 1000

  try {
    const files = fs.readdirSync(CACHE_DIR)
    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file)
      const stats = fs.statSync(filePath)
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath)
        console.log(`[Daily Guide Cache] Cleaned old file: ${file}`)
      }
    }
  } catch (error) {
    console.error('[Daily Guide Cache] Error cleaning old cache:', error)
  }
}
