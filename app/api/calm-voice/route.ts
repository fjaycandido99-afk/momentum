import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { CALM_VOICE_SCRIPTS } from '@/lib/calm-voice-scripts'

// Voice ID mapping by guide tone
const TONE_VOICES: Record<string, string> = {
  calm: 'XB0fDUnXU5powFXDhCwa',     // Charlotte - calm and soothing
  neutral: 'uju3wxzG5OhpWcoi3SMy',   // Neutral voice
  direct: 'goT3UYdM9bhm0n2lmKQx',   // Direct voice
}

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

// DB-backed cache for audio (persists across Vercel cold starts)
async function getCachedAudio(cacheKey: string): Promise<{ script: string; audioBase64: string } | null> {
  try {
    const cached = await prisma.audioCache.findUnique({
      where: { cache_key: cacheKey },
    })
    if (cached) {
      return { script: '', audioBase64: cached.audio }
    }
  } catch (e) {
    console.error('[Calm Voice Cache] DB read error:', e)
  }
  return null
}

// Save audio to DB cache
async function setCachedAudio(cacheKey: string, script: string, audioBase64: string) {
  try {
    await prisma.audioCache.upsert({
      where: { cache_key: cacheKey },
      update: { audio: audioBase64, duration: 0 },
      create: { cache_key: cacheKey, audio: audioBase64, duration: 0 },
    })
  } catch (e) {
    console.error('[Calm Voice Cache] DB write error:', e)
  }
}

// Get today's date string for cache key
function getTodayDateString(): string {
  const today = new Date()
  return today.toISOString().split('T')[0] // YYYY-MM-DD
}

// Get fallback script index (used when AI generation fails)
function getFallbackScriptIndex(type: string): number {
  const today = new Date()
  const dayOfMonth = today.getDate() - 1
  const scripts = CALM_VOICE_SCRIPTS[type as keyof typeof CALM_VOICE_SCRIPTS]
  return dayOfMonth % (scripts?.length || 1)
}

// Content type prompts for AI generation
const CONTENT_TYPES = {
  breathing: {
    prompt: 'Write a 2-minute guided breathing exercise script. Include slow breathing instructions, counts, and calming imagery. About 250 words.',
    color: 'from-cyan-600 to-blue-800',
  },
  affirmation: {
    prompt: 'Write a 2-minute positive affirmation script using "I am" statements. Include themes of self-worth, capability, and inner peace. About 250 words.',
    color: 'from-purple-600 to-indigo-800',
  },
  meditation: {
    prompt: 'Write a 2-minute body scan meditation script. Guide the listener through relaxing each body part from head to toe. About 250 words.',
    color: 'from-indigo-600 to-purple-900',
  },
  gratitude: {
    prompt: 'Write a 2-minute gratitude meditation script. Guide the listener to appreciate various aspects of their life. About 250 words.',
    color: 'from-amber-500 to-orange-700',
  },
  sleep: {
    prompt: 'Write a 2-minute sleep meditation script. Use progressive relaxation and soothing imagery to help the listener drift off. About 250 words.',
    color: 'from-slate-700 to-slate-900',
  },
  anxiety: {
    prompt: 'Write a 2-minute grounding exercise for anxiety. Include the 5-4-3-2-1 technique and reassuring messages. About 250 words.',
    color: 'from-teal-600 to-emerald-800',
  },
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, textOnly } = await request.json()
    const contentType = CONTENT_TYPES[type as keyof typeof CONTENT_TYPES] || CONTENT_TYPES.breathing
    const preWritten = CALM_VOICE_SCRIPTS[type as keyof typeof CALM_VOICE_SCRIPTS]

    // Get authenticated user's tone preference
    let tone = 'calm'
    try {
      const prefs = await prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { guide_tone: true },
      })
      tone = prefs?.guide_tone || 'calm'
    } catch {
      // Fall back to calm tone
    }

    const dateString = getTodayDateString()
    // Date-based cache key: fresh content daily
    const cacheKey = `calm-${type}-${dateString}-${tone}`

    // Check date-based cache first
    const cached = await getCachedAudio(cacheKey)
    if (cached) {
      console.log(`[DB Cache HIT] Serving cached audio for ${cacheKey}`)
      // Try to get the script from AI generation cache, fall back to pre-written
      const fallbackIndex = getFallbackScriptIndex(type)
      return NextResponse.json({
        script: preWritten?.[fallbackIndex] || '',
        audioBase64: textOnly ? null : cached.audioBase64,
        color: contentType.color,
        type,
        cached: true,
      })
    }

    // Try Groq AI generation first for fresh daily content
    let script = ''
    try {
      const completion = await getGroq().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a calm, soothing meditation guide. Write scripts that are peaceful and reassuring. Use ellipses (...) for pauses. No markdown formatting.' },
          { role: 'user', content: `${contentType.prompt} Today is ${dateString}. Make this unique and different from previous days.` },
        ],
        max_tokens: 500,
        temperature: 0.8,
      })
      script = completion.choices[0]?.message?.content || ''
    } catch (e) {
      console.error('[Groq] AI generation failed, falling back to pre-written:', e)
    }

    // Fall back to pre-written script if AI generation failed
    if (!script) {
      const fallbackIndex = getFallbackScriptIndex(type)
      script = preWritten?.[fallbackIndex] || ''
    }

    // If textOnly, return script without generating audio
    if (textOnly) {
      return NextResponse.json({
        script,
        audioBase64: null,
        color: contentType.color,
        type,
        textOnly: true,
        characterCount: script.length,
      })
    }

    // Generate audio with ElevenLabs
    const apiKey = process.env.ELEVENLABS_API_KEY
    let audioBase64 = null

    if (apiKey) {
      // Select voice based on user's tone preference
      const voiceId = TONE_VOICES[tone] || TONE_VOICES.calm

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

      if (ttsResponse.ok) {
        const audioBuffer = await ttsResponse.arrayBuffer()
        audioBase64 = Buffer.from(audioBuffer).toString('base64')

        // Save to DB cache with date-based key
        await setCachedAudio(cacheKey, script, audioBase64)
        console.log(`[DB Cache SET] Saved audio for ${cacheKey}`)
      } else {
        const errorText = await ttsResponse.text()
        console.error(`[ElevenLabs Error] Status: ${ttsResponse.status}, Response: ${errorText}`)
      }
    } else {
      console.error('[ElevenLabs Error] No API key found')
    }

    return NextResponse.json({
      script,
      audioBase64,
      color: contentType.color,
      type,
      characterCount: script.length,
    })
  } catch (error) {
    console.error('Calm voice error:', error)
    return NextResponse.json(
      { error: 'Failed to generate calming audio' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    types: [
      { id: 'breathing', name: 'Breathing', icon: 'wind', color: 'from-cyan-600 to-blue-800' },
      { id: 'affirmation', name: 'Affirmations', icon: 'sparkles', color: 'from-purple-600 to-indigo-800' },
      { id: 'meditation', name: 'Body Scan', icon: 'user', color: 'from-indigo-600 to-purple-900' },
      { id: 'gratitude', name: 'Gratitude', icon: 'heart', color: 'from-amber-500 to-orange-700' },
      { id: 'sleep', name: 'Sleep', icon: 'moon', color: 'from-slate-700 to-slate-900' },
      { id: 'anxiety', name: 'Grounding', icon: 'anchor', color: 'from-teal-600 to-emerald-800' },
    ],
  })
}
