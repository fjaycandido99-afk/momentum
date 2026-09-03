/**
 * POST /api/ai/chat-voice — speak one AI chat reply in the user's own
 * Voice Tone (Settings → Voice Tone), using the same ElevenLabs voices
 * the daily guide uses.
 *
 * Split out from the chat reply itself on purpose: text should land the
 * instant the model returns it. Generating speech inline would hold the
 * whole reply back by a second or two for a feature the user may not even
 * play, and it would make a TTS failure look like a chat failure.
 *
 * Two ceilings, both deliberate:
 *   - Per user, per day, via the same AI meter as everything else
 *     (chat_voice: locked on free, 30/day on premium).
 *   - Per month across all users, via the chat sub-budget in
 *     audio-utils, so conversation can never drink the daily guide's
 *     credits.
 *
 * Replies are short and highly repetitive across users ("What comes up
 * when you sit with that?"), so identical text in the same voice is
 * cached and served without spending a second time.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { aiGate } from '@/lib/ai/gate'
import { isGuideTone } from '@/lib/ai/voice-tone'
import {
  generateAudio,
  getSharedCached,
  setSharedCache,
  TTS_CHAT_BUDGET_KEY,
} from '@/lib/daily-guide/audio-utils'

export const dynamic = 'force-dynamic'

/** Long replies are a prompt bug, not a thing to pay ElevenLabs for. */
const MAX_CHARS = 600

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit(`ai-chat-voice:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const text = typeof body?.text === 'string' ? body.text.trim() : ''

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json({ error: 'text too long' }, { status: 413 })
    }

    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { guide_tone: true },
    })
    const tone = isGuideTone(prefs?.guide_tone) ? prefs!.guide_tone! : 'calm'

    // Serve a cache hit before spending a quota unit — replaying a line
    // that cost nothing should not count against the user's day.
    const cacheKey = `chat-${tone}-${createHash('sha1').update(text).digest('hex').slice(0, 32)}`
    const cached = await getSharedCached(cacheKey)
    if (cached) {
      return NextResponse.json({ audio: cached.audioBase64, duration: cached.duration, tone, cached: true })
    }

    const gate = await aiGate(user.id, 'chat_voice')
    if (!gate.ok) return gate.response

    const { audioBase64, duration } = await generateAudio(text, tone, TTS_CHAT_BUDGET_KEY)

    if (!audioBase64) {
      // Out of credits, or ElevenLabs is down. There is no browser-TTS
      // fallback in this app, so say so plainly rather than returning a
      // success with no sound and letting the UI look broken.
      return NextResponse.json(
        { error: 'Voice unavailable right now', unavailable: true },
        { status: 503 }
      )
    }

    await setSharedCache(cacheKey, audioBase64, duration)

    return NextResponse.json({
      audio: audioBase64,
      duration,
      tone,
      cached: false,
      quota: { remaining: gate.quota.remaining, limit: gate.quota.limit },
    })
  } catch (error) {
    console.error('Chat voice error:', error)
    return NextResponse.json({ error: 'Voice unavailable right now', unavailable: true }, { status: 503 })
  }
}
