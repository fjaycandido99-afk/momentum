import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { parseModelJson } from '@/lib/ai/json'
import { detectCrisisLevel, detectRegion, crisisResourceForLevel } from '@/lib/ai/crisis-detect'
import { ERA_PRESETS } from '@/lib/era/presets'
import { validateFirstMoment } from '@/lib/onboarding/first-launch'
import { signVoiceLine } from '@/lib/onboarding/voice-sign'

export const dynamic = 'force-dynamic'

/**
 * POST { text } — the first launch's one AI moment (components/onboarding/
 * FirstLaunch): a short reply to the one thing they want to change, up to
 * three eras FROM THE PRESET LIST, and a first promise with an easier one.
 *
 * Always answers. No key, no quota, a slow or garbled model: the pure
 * fallbacks in lib/onboarding/first-launch fill it (`ai: false`), so the
 * opener never stalls on a spinner. Crisis language is checked on the raw
 * text before any model sees it, the same as the chat.
 *
 * Writes nothing: the era and promise are created by the person's own taps,
 * through the normal routes.
 *
 * Open to someone who hasn't signed up yet (Francis, 2026-10-03: the opener
 * is the taste, so they get all of it), rate-limited by IP. The reply comes
 * back with `replySig` so the voice route will speak exactly it — and
 * nothing else — without an account.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
    const { allowed } = rateLimit(user ? `first-moment:${user.id}` : `first-moment-ip:${ip}`, { limit: user ? 4 : 3, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const text = typeof body?.text === 'string' ? body.text.replace(/\s+/g, ' ').trim().slice(0, 400) : ''
    if (!text) return NextResponse.json({ error: 'Tell me one thing first' }, { status: 400 })

    const prefs = user ? await prisma.userPreferences.findUnique({ where: { user_id: user.id }, select: { timezone: true } }) : null
    const level = detectCrisisLevel(text)
    const crisis = level ? crisisResourceForLevel(level, detectRegion(prefs?.timezone)) : null

    const answer = (m: ReturnType<typeof validateFirstMoment>, extra: Record<string, unknown>) =>
      NextResponse.json({ ...m, replySig: signVoiceLine(m.reply), ...extra })
    const fallback = () => answer(validateFirstMoment(null, text), { crisis, ai: false })
    // Someone who just said something that reads as crisis gets a kind,
    // plain reply and the resources — not a model improvising.
    if (crisis) {
      return answer(
        validateFirstMoment({ reply: 'Thank you for telling me. You deserve real support with that, not just an app. There are people you can reach right now, below. Whenever you\'re ready, we can take today one small step at a time.' }, text),
        { crisis, ai: false },
      )
    }

    // Onboarding doesn't spend a free user's chat messages. It's free ONCE —
    // for someone who hasn't started an era — so it can't become a free AI
    // endpoint; past that, the pure fallback answers.
    if (user && (await prisma.era.count({ where: { user_id: user.id } })) > 0) return fallback()

    const eraList = ERA_PRESETS.map(p => `- ${p.key}: ${p.title} — ${p.tagline}`).join('\n')
    const prompt = `Someone just opened Voxu for the first time and told you one thing they want to change:
"${text}"

Reply with ONLY a JSON object, no other text:
{
  "reply": "one or two warm sentences, under 35 words, that show you heard what THEY said. No labels about them, no diagnosis, no promises about results.",
  "eras": ["up to three keys from the list below that fit best, best first"],
  "promise": "one concrete thing they could do TODAY in about 20 focused minutes, toward that change. Under 70 characters. Starts with I'll.",
  "easier": "a smaller version of the same promise, about 5 minutes. Under 70 characters. Starts with I'll."
}

Eras (use these keys only):
${eraList}`

    try {
      const completion = await getGroq('first-moment').chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.6,
      })
      const parsed = parseModelJson(completion.choices[0]?.message?.content)
      if (!parsed) return fallback()
      return answer(validateFirstMoment(parsed, text), { crisis: null, ai: true })
    } catch (err) {
      console.warn('[first-moment] model unavailable, using fallback:', err)
      return fallback()
    }
  } catch (error) {
    console.error('[first-moment] error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
