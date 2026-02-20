import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { CALM_VOICE_SCRIPTS } from '@/lib/calm-voice-scripts'
import { generateAudio } from '@/lib/daily-guide/audio-utils'

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

    // Variant pool: 3 cached audio files per type+tone, cycled by day-of-year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    const POOL_SIZE = 3
    const variant = dayOfYear % POOL_SIZE
    const cacheKey = `calm-${type}-${tone}-v${variant}`

    // Check today's variant first, then try ANY cached variant before spending credits
    let cached = await getCachedAudio(cacheKey)
    if (!cached) {
      for (let i = 0; i < POOL_SIZE; i++) {
        if (i === variant) continue
        const alt = await getCachedAudio(`calm-${type}-${tone}-v${i}`)
        if (alt) { cached = alt; break }
      }
      // Also check old date-based cache keys that may still exist
      if (!cached) {
        const oldKeys = await prisma.audioCache.findFirst({
          where: { cache_key: { startsWith: `calm-${type}-` } },
          select: { audio: true },
        })
        if (oldKeys) cached = { script: '', audioBase64: oldKeys.audio }
      }
    }
    if (cached) {
      console.log(`[DB Cache HIT] Reusing cached audio for ${type}-${tone}`)
      const fallbackIndex = getFallbackScriptIndex(type)
      return NextResponse.json({
        script: preWritten?.[fallbackIndex] || '',
        audioBase64: textOnly ? null : cached.audioBase64,
        color: contentType.color,
        type,
        cached: true,
      })
    }

    // Generate script — try AI first, then pre-written fallback
    const dateString = getTodayDateString()
    let script = ''
    try {
      const completion = await getGroq().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a calm, soothing meditation guide. Write scripts that are peaceful and reassuring. Use ellipses (...) for pauses. No markdown formatting.' },
          { role: 'user', content: `${contentType.prompt} Today is ${dateString}. Variant ${variant + 1} of ${POOL_SIZE}. Make this unique.` },
        ],
        max_tokens: 500,
        temperature: 0.8,
      })
      script = completion.choices[0]?.message?.content || ''
    } catch (e) {
      console.error('[Groq] AI generation failed, falling back to pre-written:', e)
    }

    if (!script) {
      const fallbackIndex = getFallbackScriptIndex(type)
      script = preWritten?.[fallbackIndex] || ''
    }

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

    // Generate audio via centralized function (tracks credits + enforces limit)
    const { audioBase64 } = await generateAudio(script, tone)

    // Cache permanently so this variant never costs credits again
    if (audioBase64) {
      await setCachedAudio(cacheKey, script, audioBase64)
      console.log(`[DB Cache SET] Permanently cached ${cacheKey}`)
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
