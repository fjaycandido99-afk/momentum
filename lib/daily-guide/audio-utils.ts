import { prisma } from '@/lib/prisma'

// Voice ID mapping by guide tone
export const TONE_VOICES: Record<string, string> = {
  calm: 'XB0fDUnXU5powFXDhCwa',     // Charlotte - calm and soothing
  neutral: 'uju3wxzG5OhpWcoi3SMy',   // Neutral voice
  direct: 'goT3UYdM9bhm0n2lmKQx',   // Direct voice
}

// DB-backed shared audio cache — persists across Vercel cold starts
export async function getSharedCached(cacheKey: string): Promise<{ audioBase64: string; duration: number } | null> {
  try {
    const cached = await prisma.audioCache.findUnique({
      where: { cache_key: cacheKey },
    })
    if (cached) {
      return { audioBase64: cached.audio, duration: cached.duration }
    }
  } catch (e) {
    console.error('[Shared Voice Cache] DB read error:', e)
  }
  return null
}

export async function setSharedCache(cacheKey: string, audioBase64: string, duration: number) {
  try {
    await prisma.audioCache.upsert({
      where: { cache_key: cacheKey },
      update: { audio: audioBase64, duration },
      create: { cache_key: cacheKey, audio: audioBase64, duration },
    })
    console.log(`[Shared Voice Cache SET] ${cacheKey}`)
  } catch (e) {
    console.error('[Shared Voice Cache] DB write error:', e)
  }
}

// Monthly credit limit (characters)
const MONTHLY_CREDIT_LIMIT = 30_000

function getMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

async function getMonthlyUsage(): Promise<number> {
  try {
    const row = await prisma.ttsUsage.findUnique({ where: { month_key: getMonthKey() } })
    return row?.credits ?? 0
  } catch { return 0 }
}

async function trackUsage(characters: number) {
  const key = getMonthKey()
  try {
    await prisma.ttsUsage.upsert({
      where: { month_key: key },
      update: { credits: { increment: characters } },
      create: { month_key: key, credits: characters },
    })
  } catch (e) {
    console.error('[TTS Usage] tracking error:', e)
  }
}

// Generate audio with ElevenLabs (max 2 min, 30k credits/month)
export async function generateAudio(script: string, tone: string = 'calm'): Promise<{ audioBase64: string | null; duration: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.error('[ElevenLabs] No API key')
    return { audioBase64: null, duration: 0 }
  }

  // Check monthly credit limit
  const used = await getMonthlyUsage()
  const charCount = script.length
  if (used + charCount > MONTHLY_CREDIT_LIMIT) {
    console.warn(`[ElevenLabs] Monthly limit reached (${used}/${MONTHLY_CREDIT_LIMIT}), falling back to browser TTS`)
    return { audioBase64: null, duration: 0 }
  }

  try {
    const voiceId = TONE_VOICES[tone] || TONE_VOICES.calm

    const response = await fetch(
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

    if (!response.ok) {
      const error = await response.text()
      console.error(`[ElevenLabs] Error: ${response.status} - ${error}`)
      return { audioBase64: null, duration: 0 }
    }

    // Track usage after successful generation
    await trackUsage(charCount)

    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    // Estimate duration: ~150 words per minute for calm speech, ~5 chars per word
    const estimatedDuration = Math.ceil((script.length / 5) / 150 * 60)

    return { audioBase64, duration: Math.min(estimatedDuration, 120) } // Cap at 2 min
  } catch (error) {
    console.error('[ElevenLabs] Exception:', error)
    return { audioBase64: null, duration: 0 }
  }
}

// Export for admin/monitoring
export { getMonthlyUsage, MONTHLY_CREDIT_LIMIT }
