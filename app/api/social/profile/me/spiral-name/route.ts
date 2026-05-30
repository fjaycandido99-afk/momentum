/**
 * POST /api/social/profile/me/spiral-name — generate (or regenerate)
 * the AI 2–3 word name for the caller's InkSpiral.
 *
 * Cheap single Groq call (llama-3.1-8b-instant). Throttled at 1 generation
 * per 60 seconds via spiral_name_at so the user can't burn through tokens
 * by mashing the button. Result is persisted on SocialProfile.spiral_name
 * and returned in the response.
 *
 * The name is grounded in:
 *   - mindset           (user.preferences.mindset)
 *   - entry_count       (drives the spiral's density)
 *   - streak_days       (drives the rings)
 *   - dominant mood     (this-week dominant from journal_mood, fallback null)
 *
 * Style guide:
 *   - 2 OR 3 words
 *   - Title Case
 *   - Evocative, not literal ("Quiet Returns", "Steady Bloom", "Open Drift")
 *   - No mention of the user's name, mood word verbatim, or numbers
 *   - No punctuation, no quotes
 */

import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { ensureProfile } from '@/lib/social/handle'
import { loadProfileWallStats } from '@/lib/social/profile-stats'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null

const THROTTLE_MS = 60_000

function fallbackName(): string {
  // Used when GROQ_API_KEY is missing or the call fails. Stable-ish so
  // the user gets SOMETHING evocative instead of a blank.
  const POOL = [
    'Quiet Returns', 'Steady Bloom', 'Open Drift', 'Slow Spark',
    'Soft Compass', 'Gentle Current', 'Inner Weather', 'Becoming Glow',
    'Patient Light', 'Tender Engine', 'Long Breath', 'Still Becoming',
  ]
  return POOL[Math.floor(Math.random() * POOL.length)]
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureProfile(user.id)

    // Throttle — only one regeneration per minute. Cheap defense against
    // tap-tap-tap and token burn.
    const existing = await prisma.socialProfile.findUnique({
      where: { user_id: user.id },
      select: { spiral_name: true, spiral_name_at: true },
    })
    if (existing?.spiral_name_at && existing.spiral_name) {
      const age = Date.now() - new Date(existing.spiral_name_at).getTime()
      if (age < THROTTLE_MS) {
        return NextResponse.json({
          spiral_name: existing.spiral_name,
          throttled: true,
        })
      }
    }

    const [wall, prefs] = await Promise.all([
      loadProfileWallStats(prisma, user.id),
      prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { mindset: true },
      }).catch(() => null),
    ])

    // Dominant mood this week from the spark — simple majority count.
    const moodCount: Record<string, number> = {}
    for (const m of wall.mood_spark) {
      if (m) moodCount[m] = (moodCount[m] || 0) + 1
    }
    const dominantMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    let name: string | null = null
    if (groq) {
      try {
        const sys = `You name a user's "ink spiral" — a generative profile fingerprint that grows from their journaling.

Rules:
- Output EXACTLY 2 or 3 words, Title Case, no punctuation, no quotes.
- Evocative, not literal. Think poetry, weather, light, growth.
- Do NOT mention mood words verbatim, numbers, days, or the user's mindset name.
- Examples of the right vibe: "Quiet Returns", "Steady Bloom", "Open Drift", "Long Breath", "Becoming Light".
- Output ONLY the name. No explanation, no preamble.`
        const userMsg = `mindset=${prefs?.mindset || 'unknown'} entries=${wall.entry_count} streak_days=${wall.streak_days} dominant_mood=${dominantMood || 'unknown'}`
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.9,
          max_tokens: 12,
        })
        const raw = completion.choices[0]?.message?.content?.trim() || ''
        // Strip quotes / punctuation; collapse to 2-3 words.
        const cleaned = raw.replace(/^["“'`]+|["”'`.!?]+$/g, '').trim()
        const words = cleaned.split(/\s+/).slice(0, 3)
        if (words.length >= 2) name = words.join(' ')
      } catch (err) {
        console.warn('[spiral-name] groq failed:', err)
      }
    }

    if (!name) name = fallbackName()

    await prisma.socialProfile.update({
      where: { user_id: user.id },
      data: { spiral_name: name, spiral_name_at: new Date() },
    })

    return NextResponse.json({ spiral_name: name, throttled: false })
  } catch (err) {
    console.error('[spiral-name POST] error:', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
