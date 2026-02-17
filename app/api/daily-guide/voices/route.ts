import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { VOICE_SCRIPTS, DAY_TYPE_VOICE_SCRIPTS } from '@/lib/daily-guide/voice-scripts'
import { getSharedCached } from '@/lib/daily-guide/audio-utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Lazy initialization to avoid build-time errors
let groq: Groq | null = null
function getGroq() {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groq
}

// Voice guide types
type VoiceGuideType = 'breathing' | 'affirmation' | 'gratitude' | 'sleep' | 'grounding' | 'stress_relief' | 'focus_meditation' | 'self_compassion' | 'confidence'

// Day-type specific voice types
type DayTypeVoiceType = 'work_prime' | 'off_prime' | 'recovery_prime' | 'work_close' | 'off_close' | 'recovery_close'

// All voice types combined
type AllVoiceType = VoiceGuideType | DayTypeVoiceType

// Get day-of-year for script rotation
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

// Get the script and its pool index for a given type
function getScriptForType(type: AllVoiceType, isRegularVoice: boolean): { script: string; index: number } {
  if (isRegularVoice) {
    return getFallbackScript(type as VoiceGuideType)
  }
  return getFallbackDayTypeScript(type as DayTypeVoiceType)
}

// Build library cache key: library-{type}-s{index}-{tone}
function getLibraryCacheKey(type: string, index: number, tone: string): string {
  return `library-${type}-s${index}-${tone}`
}

// Fetch yesterday's journal entries for personalization
async function getYesterdayContext(userId: string): Promise<string | null> {
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const yesterdayGuide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: {
          user_id: userId,
          date: yesterday,
        },
      },
      select: {
        journal_win: true,
        journal_intention: true,
        journal_gratitude: true,
      },
    })

    if (!yesterdayGuide) return null

    const parts: string[] = []
    if (yesterdayGuide.journal_win) {
      parts.push(`Yesterday they noted this win: "${yesterdayGuide.journal_win}"`)
    }
    if (yesterdayGuide.journal_intention) {
      parts.push(`Their intention was: "${yesterdayGuide.journal_intention}"`)
    }
    if (yesterdayGuide.journal_gratitude) {
      parts.push(`They expressed gratitude for: "${yesterdayGuide.journal_gratitude}"`)
    }

    return parts.length > 0 ? parts.join('. ') + '.' : null
  } catch (e) {
    console.error('[Yesterday Context] Error fetching:', e)
    return null
  }
}

// Generate personalized text via Groq (text only, no audio generation)
async function generatePersonalizedText(
  type: AllVoiceType,
  isRegularVoice: boolean,
  yesterdayContext: string,
): Promise<string | null> {
  try {
    const VOICE_TYPE_PROMPTS: Record<VoiceGuideType, string> = {
      breathing: 'Write a 2-minute guided breathing exercise script. Include slow breathing instructions with counts, calming imagery, and pauses. About 200-250 words.',
      affirmation: 'Write a 2-minute positive affirmation script using "I am" statements. Include themes of self-worth, capability, and inner peace. About 200-250 words.',
      gratitude: 'Write a 2-minute gratitude meditation script. Guide the listener to notice and appreciate various aspects of their life. About 200-250 words.',
      sleep: 'Write a 2-minute sleep meditation script. Use progressive relaxation and soothing imagery to help the listener drift into sleep. About 200-250 words.',
      grounding: 'Write a 2-minute grounding exercise. Include sensory awareness techniques and reassuring messages to bring the listener to the present. About 200-250 words.',
    }

    const DAY_TYPE_PROMPTS: Record<DayTypeVoiceType, string> = {
      work_prime: 'Write a 2-minute morning intention-setting script for a work day. Help the listener set priorities, embody focus, and feel prepared. About 200-250 words.',
      off_prime: 'Write a 2-minute morning script for a day off. Encourage rest, joy, and permission to do nothing productive. About 200-250 words.',
      recovery_prime: 'Write a 2-minute morning script for a recovery day. Emphasize self-compassion, gentle healing, and lowered expectations. About 200-250 words.',
      work_close: 'Write a 2-minute evening wind-down script for after a work day. Help release work stress, reflect on accomplishments, and transition to rest. About 200-250 words.',
      off_close: 'Write a 2-minute evening script for the end of a day off. Express gratitude for rest, contentment, and gentle preparation for sleep. About 200-250 words.',
      recovery_close: 'Write a 2-minute evening script for the end of a recovery day. Acknowledge healing, release guilt, and set a gentle intention for tomorrow. About 200-250 words.',
    }

    const prompt = isRegularVoice
      ? VOICE_TYPE_PROMPTS[type as VoiceGuideType]
      : DAY_TYPE_PROMPTS[type as DayTypeVoiceType]

    const userMessage = `${prompt} Make this unique and fresh.\n\nIMPORTANT PERSONALIZATION: ${yesterdayContext} Briefly reference one of these naturally in the opening, without quoting them verbatim.`

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a calm, soothing wellness guide. Write scripts that are peaceful and reassuring. Use ellipses (...) for pauses. No markdown formatting.' },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.8,
    })

    return completion.choices[0]?.message?.content || null
  } catch (e) {
    console.error('[Groq] Personalized text generation failed:', e)
    return null
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

// All valid voice types
const VALID_VOICE_TYPES = ['breathing', 'affirmation', 'gratitude', 'sleep', 'grounding', 'stress_relief', 'focus_meditation', 'self_compassion', 'confidence']
const VALID_DAY_TYPE_VOICES = ['work_prime', 'off_prime', 'recovery_prime', 'work_close', 'off_close', 'recovery_close']

// GET - Fetch today's voices (library-first, no on-demand ElevenLabs)
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

      // 1. Check if already saved to this user's daily guide
      if (guide[scriptField] && guide[audioField]) {
        return NextResponse.json({
          type,
          script: guide[scriptField],
          audioBase64: guide[audioField],
          duration: guide[durationField] || 120,
          cached: true,
        })
      }

      // 2. Look up from pre-recorded library
      const { script, index } = getFallbackScript(type)
      const libraryCacheKey = getLibraryCacheKey(type, index, tone)
      const libraryHit = await getSharedCached(libraryCacheKey)

      let audioBase64: string | null = null
      let duration = 0

      if (libraryHit) {
        console.log(`[Voice Library HIT] ${libraryCacheKey}`)
        audioBase64 = libraryHit.audioBase64
        duration = libraryHit.duration
      }

      // Save to user's daily guide DB record if we have audio
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
        audioBase64, // null if library miss — text-only fallback
        duration,
        cached: !!libraryHit,
        libraryKey: libraryCacheKey,
      })
    }

    // Return all voice data status
    const voiceTypes: VoiceGuideType[] = ['breathing', 'affirmation', 'gratitude', 'sleep', 'grounding', 'stress_relief', 'focus_meditation', 'self_compassion', 'confidence']
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

// POST - Generate a specific voice type (library-first, no on-demand ElevenLabs)
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

    // 1. Check if already saved to this user's daily guide (skip for textOnly)
    if (!textOnly && guide[scriptField] && guide[audioField]) {
      return NextResponse.json({
        type,
        script: guide[scriptField],
        audioBase64: guide[audioField],
        duration: guide[durationField] || 120,
        cached: true,
      })
    }

    // 2. Get the pre-written script and its pool index
    const { script: baseScript, index } = getScriptForType(type, isRegularVoice)

    // 3. Check for personalization (Groq text only, no ElevenLabs)
    const isPrimeType = type.endsWith('_prime')
    let personalizedText: string | null = null
    let yesterdayContext: string | null = null

    if (isPrimeType && userId !== 'demo-user') {
      yesterdayContext = await getYesterdayContext(userId)
      if (yesterdayContext) {
        personalizedText = await generatePersonalizedText(type, isRegularVoice, yesterdayContext)
      }
    }

    // The script shown to the user: personalized if available, otherwise base
    const displayScript = personalizedText || baseScript

    // If textOnly, return script without audio
    if (textOnly) {
      if (!guide[scriptField]) {
        await prisma.dailyGuide.update({
          where: { id: guide.id },
          data: { [scriptField]: displayScript },
        }).catch(() => {})
      }

      return NextResponse.json({
        type,
        script: displayScript,
        audioBase64: null,
        duration: 0,
        textOnly: true,
        personalized: !!personalizedText,
      })
    }

    // 4. Look up audio from pre-recorded library (keyed to base script index)
    const libraryCacheKey = getLibraryCacheKey(type, index, tone)
    const libraryHit = await getSharedCached(libraryCacheKey)

    let audioBase64: string | null = null
    let duration = 0

    if (libraryHit) {
      console.log(`[Voice Library HIT] ${libraryCacheKey}`)
      audioBase64 = libraryHit.audioBase64
      duration = libraryHit.duration
    } else {
      // Library miss — serve text-only, NO on-demand ElevenLabs call
      console.log(`[Voice Library MISS] ${libraryCacheKey} — serving text-only`)
    }

    // Save to user's daily guide DB record
    if (audioBase64) {
      await prisma.dailyGuide.update({
        where: { id: guide.id },
        data: {
          [scriptField]: displayScript,
          [audioField]: audioBase64,
          [durationField]: duration,
        },
      })
    } else if (!guide[scriptField]) {
      // Save script even without audio
      await prisma.dailyGuide.update({
        where: { id: guide.id },
        data: { [scriptField]: displayScript },
      }).catch(() => {})
    }

    return NextResponse.json({
      type,
      script: displayScript,
      audioBase64, // null if library miss
      duration,
      cached: !!libraryHit,
      personalized: !!personalizedText,
      libraryKey: libraryCacheKey,
    })
  } catch (error) {
    console.error('Daily voices POST error:', error)
    return NextResponse.json({ error: 'Failed to generate voice' }, { status: 500 })
  }
}
