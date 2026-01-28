import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { VOICE_SCRIPTS, DAY_TYPE_VOICE_SCRIPTS } from '@/lib/daily-guide/voice-scripts'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Voice ID mapping by guide tone
const TONE_VOICES: Record<string, string> = {
  calm: 'XB0fDUnXU5powFXDhCwa',     // Charlotte - calm and soothing
  neutral: 'uju3wxzG5OhpWcoi3SMy',   // Neutral voice
  direct: 'goT3UYdM9bhm0n2lmKQx',   // Direct voice
}

// DB-backed shared audio cache — persists across Vercel cold starts
async function getSharedCached(cacheKey: string): Promise<{ audioBase64: string; duration: number } | null> {
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

async function setSharedCache(cacheKey: string, audioBase64: string, duration: number) {
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

// Lazy initialization to avoid build-time errors
let groq: Groq | null = null
function getGroq() {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groq
}

// Voice guide types
type VoiceGuideType = 'breathing' | 'affirmation' | 'gratitude' | 'sleep' | 'grounding'

// Day-type specific voice types
type DayTypeVoiceType = 'work_prime' | 'off_prime' | 'recovery_prime' | 'work_close' | 'off_close' | 'recovery_close'

// All voice types combined
type AllVoiceType = VoiceGuideType | DayTypeVoiceType

// AI generation prompts for voice types
const VOICE_TYPE_PROMPTS: Record<VoiceGuideType, string> = {
  breathing: 'Write a 2-minute guided breathing exercise script. Include slow breathing instructions with counts, calming imagery, and pauses. About 200-250 words.',
  affirmation: 'Write a 2-minute positive affirmation script using "I am" statements. Include themes of self-worth, capability, and inner peace. About 200-250 words.',
  gratitude: 'Write a 2-minute gratitude meditation script. Guide the listener to notice and appreciate various aspects of their life. About 200-250 words.',
  sleep: 'Write a 2-minute sleep meditation script. Use progressive relaxation and soothing imagery to help the listener drift into sleep. About 200-250 words.',
  grounding: 'Write a 2-minute grounding exercise. Include sensory awareness techniques and reassuring messages to bring the listener to the present. About 200-250 words.',
}

// AI generation prompts for day-type voices
const DAY_TYPE_PROMPTS: Record<DayTypeVoiceType, string> = {
  work_prime: 'Write a 2-minute morning intention-setting script for a work day. Help the listener set priorities, embody focus, and feel prepared. About 200-250 words.',
  off_prime: 'Write a 2-minute morning script for a day off. Encourage rest, joy, and permission to do nothing productive. About 200-250 words.',
  recovery_prime: 'Write a 2-minute morning script for a recovery day. Emphasize self-compassion, gentle healing, and lowered expectations. About 200-250 words.',
  work_close: 'Write a 2-minute evening wind-down script for after a work day. Help release work stress, reflect on accomplishments, and transition to rest. About 200-250 words.',
  off_close: 'Write a 2-minute evening script for the end of a day off. Express gratitude for rest, contentment, and gentle preparation for sleep. About 200-250 words.',
  recovery_close: 'Write a 2-minute evening script for the end of a recovery day. Acknowledge healing, release guilt, and set a gentle intention for tomorrow. About 200-250 words.',
}

// Get today's date string for cache key
function getTodayDateString(): string {
  const today = new Date()
  return today.toISOString().split('T')[0] // YYYY-MM-DD
}

// Get day-of-year for fallback script rotation
function getDayOfYear(): number {
  return Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
}

// Get fallback script based on date rotation
function getFallbackScript(type: VoiceGuideType): { script: string; index: number } {
  const scripts = VOICE_SCRIPTS[type]
  const index = getDayOfYear() % scripts.length
  return { script: scripts[index], index }
}

// Get fallback day-type script
function getFallbackDayTypeScript(type: DayTypeVoiceType): { script: string; index: number } {
  const scripts = DAY_TYPE_VOICE_SCRIPTS[type]
  const index = getDayOfYear() % scripts.length
  return { script: scripts[index], index }
}

// Try AI generation, fall back to pre-written
async function getOrGenerateScript(
  type: AllVoiceType,
  isRegularVoice: boolean,
  dateString: string,
): Promise<string> {
  // Try AI generation
  try {
    const prompt = isRegularVoice
      ? VOICE_TYPE_PROMPTS[type as VoiceGuideType]
      : DAY_TYPE_PROMPTS[type as DayTypeVoiceType]

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a calm, soothing wellness guide. Write scripts that are peaceful and reassuring. Use ellipses (...) for pauses. No markdown formatting.' },
        { role: 'user', content: `${prompt} Make this unique and fresh.` },
      ],
      max_tokens: 500,
      temperature: 0.8,
    })

    const content = completion.choices[0]?.message?.content
    if (content) return content
  } catch (e) {
    console.error('[Groq] AI generation failed, falling back to pre-written:', e)
  }

  // Fallback to pre-written
  if (isRegularVoice) {
    return getFallbackScript(type as VoiceGuideType).script
  }
  return getFallbackDayTypeScript(type as DayTypeVoiceType).script
}

// Generate audio with ElevenLabs (max 2 min)
async function generateAudio(script: string, tone: string = 'calm'): Promise<{ audioBase64: string | null; duration: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.error('[ElevenLabs] No API key')
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

// Look up user's guide tone from preferences
async function getUserTone(userId: string): Promise<string> {
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: userId },
      select: { guide_tone: true },
    })
    return prefs?.guide_tone || 'calm'
  } catch {
    return 'calm'
  }
}

// GET - Fetch today's voices (generate if needed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as VoiceGuideType | null

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || searchParams.get('userId') || 'demo-user'
    const tone = user ? await getUserTone(userId) : 'calm'

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find or create today's guide
    let guide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: {
          user_id: userId,
          date: today,
        },
      },
    })

    if (!guide) {
      // Create a basic guide entry for today
      guide = await prisma.dailyGuide.create({
        data: {
          user_id: userId,
          date: today,
          day_type: 'work',
          modules: [],
        },
      })
    }

    // If requesting specific type
    if (type) {
      const scriptField = `${type}_script` as keyof typeof guide
      const audioField = `${type}_audio` as keyof typeof guide
      const durationField = `${type}_duration` as keyof typeof guide

      // Check if already saved to this user's daily guide
      if (guide[scriptField] && guide[audioField]) {
        return NextResponse.json({
          type,
          script: guide[scriptField],
          audioBase64: guide[audioField],
          duration: guide[durationField] || 120,
          cached: true,
        })
      }

      const dateString = getTodayDateString()
      const cacheKey = `voice-${type}-${dateString}-${tone}`

      // Check date-based shared cache
      let audioBase64: string | null = null
      let duration = 0
      const shared = await getSharedCached(cacheKey)
      if (shared) {
        console.log(`[Shared Voice Cache HIT] ${cacheKey}`)
        audioBase64 = shared.audioBase64
        duration = shared.duration
      } else {
        // Generate or fall back to pre-written
        const script = await getOrGenerateScript(type, true, dateString)
        const result = await generateAudio(script, tone)
        audioBase64 = result.audioBase64
        duration = result.duration
        if (audioBase64) {
          await setSharedCache(cacheKey, audioBase64, duration)
        }
      }

      // Get script for response (use fallback for display)
      const { script } = getFallbackScript(type)

      // Save to user's daily guide DB record
      if (audioBase64) {
        await prisma.dailyGuide.update({
          where: { id: guide.id },
          data: {
            [scriptField]: script,
            [audioField]: audioBase64,
            [durationField]: duration,
          },
        })
      }

      return NextResponse.json({
        type,
        script,
        audioBase64,
        duration,
        cached: !!shared,
      })
    }

    // Return all voice data status
    const voiceTypes: VoiceGuideType[] = ['breathing', 'affirmation', 'gratitude', 'sleep', 'grounding']
    const voices = voiceTypes.map(t => ({
      type: t,
      hasScript: !!guide?.[`${t}_script` as keyof typeof guide],
      hasAudio: !!guide?.[`${t}_audio` as keyof typeof guide],
      duration: guide?.[`${t}_duration` as keyof typeof guide] || 0,
    }))

    return NextResponse.json({ voices, guideId: guide?.id })
  } catch (error) {
    console.error('Daily voices GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 })
  }
}

// All valid voice types
const VALID_VOICE_TYPES = ['breathing', 'affirmation', 'gratitude', 'sleep', 'grounding']
const VALID_DAY_TYPE_VOICES = ['work_prime', 'off_prime', 'recovery_prime', 'work_close', 'off_close', 'recovery_close']

// POST - Generate a specific voice type
export async function POST(request: NextRequest) {
  try {
    const { type, textOnly } = await request.json()

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || 'demo-user'
    const tone = user ? await getUserTone(userId) : 'calm'

    const isRegularVoice = VALID_VOICE_TYPES.includes(type)
    const isDayTypeVoice = VALID_DAY_TYPE_VOICES.includes(type)

    if (!type || (!isRegularVoice && !isDayTypeVoice)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find or create today's guide
    let guide = await prisma.dailyGuide.upsert({
      where: {
        user_id_date: {
          user_id: userId,
          date: today,
        },
      },
      create: {
        user_id: userId,
        date: today,
        day_type: 'work',
        modules: [],
      },
      update: {},
    })

    const scriptField = `${type}_script` as keyof typeof guide
    const audioField = `${type}_audio` as keyof typeof guide
    const durationField = `${type}_duration` as keyof typeof guide

    // Check if already saved to this user's daily guide (skip for textOnly)
    if (!textOnly && guide[scriptField] && guide[audioField]) {
      return NextResponse.json({
        type,
        script: guide[scriptField],
        audioBase64: guide[audioField],
        duration: guide[durationField] || 120,
        cached: true,
      })
    }

    const dateString = getTodayDateString()
    const cacheKey = `voice-${type}-${dateString}-${tone}`

    // Get or generate script
    const script = await getOrGenerateScript(type, isRegularVoice, dateString)

    // If textOnly, return script without generating audio
    if (textOnly) {
      // Still save script to guide record for reference
      if (!guide[scriptField]) {
        await prisma.dailyGuide.update({
          where: { id: guide.id },
          data: { [scriptField]: script },
        }).catch(() => {})
      }

      return NextResponse.json({
        type,
        script,
        audioBase64: null,
        duration: 0,
        textOnly: true,
      })
    }

    // Check date-based shared cache
    let audioBase64: string | null = null
    let duration = 0
    const shared = await getSharedCached(cacheKey)
    if (shared) {
      console.log(`[Shared Voice Cache HIT] ${cacheKey}`)
      audioBase64 = shared.audioBase64
      duration = shared.duration
    } else {
      // Generate audio
      const result = await generateAudio(script, tone)
      audioBase64 = result.audioBase64
      duration = result.duration
      if (audioBase64) {
        await setSharedCache(cacheKey, audioBase64, duration)
      }
    }

    // Save to user's daily guide DB record
    if (audioBase64) {
      await prisma.dailyGuide.update({
        where: { id: guide.id },
        data: {
          [scriptField]: script,
          [audioField]: audioBase64,
          [durationField]: duration,
        },
      })
    }

    return NextResponse.json({
      type,
      script,
      audioBase64,
      duration,
      cached: !!shared,
    })
  } catch (error) {
    console.error('Daily voices POST error:', error)
    return NextResponse.json({ error: 'Failed to generate voice' }, { status: 500 })
  }
}
