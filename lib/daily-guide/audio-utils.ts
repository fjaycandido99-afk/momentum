import { prisma } from '@/lib/prisma'

// Voice ID mapping by guide tone
export const TONE_VOICES: Record<string, string> = {
  calm: 'jguI6DAHl2kb9EpGEjEx',     // Calm and soothing voice
  neutral: 'flHkNRp1BlvT73UL6gyz',   // Balanced neutral tone
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

// Monthly credit limit (characters) — raised to use available ElevenLabs credits
const MONTHLY_CREDIT_LIMIT = 500_000

// Sub-budget for conversational replies.
//
// The chat speaks far more often than the daily guide does, and they draw
// on the same pool. Without a ceiling of its own, a busy chat month would
// consume the whole allowance and the guided audio — the thing people
// actually subscribe for — would silently go quiet, because whoever calls
// generateAudio first wins.
//
// So chat spends against BOTH counters: its own cap here, and the global
// one above. It is cut off when either is reached; the guide only ever
// checks the global one, which means the guide can always use whatever
// chat has not already spent, but never the reverse.
//
// Tune with TTS_CHAT_MONTHLY_LIMIT. Keep it comfortably under
// MONTHLY_CREDIT_LIMIT or the reservation is meaningless.
const CHAT_CREDIT_LIMIT = Number(process.env.TTS_CHAT_MONTHLY_LIMIT ?? 150_000)

export const TTS_CHAT_BUDGET_KEY = 'chat'

function getMonthKey(scope?: string) {
  const now = new Date()
  const base = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return scope ? `${base}:${scope}` : base
}

async function getMonthlyUsage(scope?: string): Promise<number> {
  try {
    const row = await prisma.ttsUsage.findUnique({ where: { month_key: getMonthKey(scope) } })
    return row?.credits ?? 0
  } catch { return 0 }
}

/** Characters of chat speech left this month. Never negative. */
export async function getChatVoiceRemaining(): Promise<number> {
  const [chatUsed, globalUsed] = await Promise.all([
    getMonthlyUsage(TTS_CHAT_BUDGET_KEY),
    getMonthlyUsage(),
  ])
  return Math.max(0, Math.min(CHAT_CREDIT_LIMIT - chatUsed, MONTHLY_CREDIT_LIMIT - globalUsed))
}

async function trackUsage(characters: number, scope?: string) {
  const keys = scope ? [getMonthKey(), getMonthKey(scope)] : [getMonthKey()]
  for (const key of keys) {
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
}

// Which ElevenLabs model speaks. `turbo` is the fast, cheap one and it is
// what made the delivery sound flat — it trades expressiveness for latency,
// which is the wrong trade for an app whose whole product is a voice being
// warm at you. `eleven_multilingual_v2` is the natural-sounding default.
//
// Override with ELEVENLABS_MODEL to go back to turbo (cheaper, faster) or to
// try a newer model without a deploy.
const PRIMARY_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'
// If the primary is unavailable on the account's plan, or is rejected for any
// reason, fall back rather than returning silence. Losing all generated audio
// because a model id changed upstream would be a much worse failure than a
// slightly flatter voice.
const FALLBACK_MODEL = 'eleven_turbo_v2_5'

// Lower stability = more emotional range and less monotone. 0.65 was
// deliberate-sounding but robotic; ~0.45 with a little style is the usual
// setting for narration that should sound like a person. speaker_boost keeps
// the voice recognisably itself at the lower stability.
const VOICE_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.80,
  style: 0.35,
  use_speaker_boost: true,
  speed: 0.95,
} as const

async function speak(voiceId: string, script: string, apiKey: string): Promise<Response> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`
  const headers = {
    Accept: 'audio/mpeg',
    'Content-Type': 'application/json',
    'xi-api-key': apiKey,
  }

  const request = (model: string) =>
    fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: script, model_id: model, voice_settings: VOICE_SETTINGS }),
    })

  const primary = await request(PRIMARY_MODEL)
  if (primary.ok || PRIMARY_MODEL === FALLBACK_MODEL) return primary

  console.warn(
    `[ElevenLabs] ${PRIMARY_MODEL} returned ${primary.status}; retrying with ${FALLBACK_MODEL}`
  )
  return request(FALLBACK_MODEL)
}

// Generate audio with ElevenLabs (max 2 min, 100k credits/month)
export async function generateAudio(
  script: string,
  tone: string = 'calm',
  /**
   * Names a sub-budget to spend against as well as the global one (see
   * CHAT_CREDIT_LIMIT). Omit for the daily guide, which spends only
   * against the global pool.
   */
  scope?: string
): Promise<{ audioBase64: string | null; duration: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.error('[ElevenLabs] No API key')
    return { audioBase64: null, duration: 0 }
  }

  // Check monthly credit limit. Note: no browser-TTS fallback actually
  // exists — the old log line here claimed one for a feature that was
  // never built. Callers get null and must handle silence themselves.
  const used = await getMonthlyUsage()
  const charCount = script.length
  if (used + charCount > MONTHLY_CREDIT_LIMIT) {
    console.warn(`[ElevenLabs] Monthly limit reached (${used}/${MONTHLY_CREDIT_LIMIT}) — returning no audio`)
    return { audioBase64: null, duration: 0 }
  }

  if (scope) {
    const scopeUsed = await getMonthlyUsage(scope)
    const scopeLimit = scope === TTS_CHAT_BUDGET_KEY ? CHAT_CREDIT_LIMIT : MONTHLY_CREDIT_LIMIT
    if (scopeUsed + charCount > scopeLimit) {
      console.warn(`[ElevenLabs] Sub-budget "${scope}" exhausted (${scopeUsed}/${scopeLimit})`)
      return { audioBase64: null, duration: 0 }
    }
  }

  try {
    const voiceId = TONE_VOICES[tone] || TONE_VOICES.calm

    const response = await speak(voiceId, script, apiKey)

    if (!response.ok) {
      const error = await response.text()
      console.error(`[ElevenLabs] Error: ${response.status} - ${error}`)
      return { audioBase64: null, duration: 0 }
    }

    // Track usage after successful generation
    await trackUsage(charCount, scope)

    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')

    // Estimate duration: ~150 words per minute for calm speech, ~5 chars per word
    const estimatedDuration = Math.ceil((script.length / 5) / 150 * 60)

    return { audioBase64, duration: estimatedDuration }
  } catch (error) {
    console.error('[ElevenLabs] Exception:', error)
    return { audioBase64: null, duration: 0 }
  }
}

// Export for admin/monitoring
export { getMonthlyUsage, MONTHLY_CREDIT_LIMIT, CHAT_CREDIT_LIMIT, PRIMARY_MODEL }
