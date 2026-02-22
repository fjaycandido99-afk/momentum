import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq } from '@/lib/groq'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const DEEP_MODEL = 'llama-3.3-70b-versatile'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit(`ai-mindset-evolution:${user.id}`, { limit: 5, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    // Check if enough data and not recently suggested
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
      select: { mindset: true, mindset_suggestion_shown_at: true },
    })

    if (!prefs) {
      return NextResponse.json(null)
    }

    // Don't suggest if already suggested in last 30 days
    if (prefs.mindset_suggestion_shown_at) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      if (new Date(prefs.mindset_suggestion_shown_at) > thirtyDaysAgo) {
        return NextResponse.json(null)
      }
    }

    // Check cached suggestion
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayGuide = await prisma.dailyGuide.findUnique({
      where: { user_id_date: { user_id: user.id, date: today } },
      select: { ai_mindset_suggestion: true },
    })

    if (todayGuide?.ai_mindset_suggestion) {
      try {
        return NextResponse.json(JSON.parse(todayGuide.ai_mindset_suggestion))
      } catch {
        // Bad cache
      }
    }

    // Need 30+ days of data
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const guides = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: thirtyDaysAgo },
        OR: [
          { journal_win: { not: null } },
          { journal_gratitude: { not: null } },
          { journal_freetext: { not: null } },
        ],
      },
      select: {
        journal_win: true,
        journal_gratitude: true,
        journal_freetext: true,
        journal_tags: true,
      },
      orderBy: { date: 'desc' },
    })

    if (guides.length < 30) {
      return NextResponse.json(null)
    }

    // Build analysis text
    const journalSample = guides.slice(0, 20).map(g => {
      const parts = []
      if (g.journal_win) parts.push(g.journal_win.substring(0, 60))
      if (g.journal_gratitude) parts.push(g.journal_gratitude.substring(0, 60))
      if (g.journal_freetext) parts.push(g.journal_freetext.substring(0, 80))
      return parts.join('. ')
    }).join('\n')

    const allTags = guides.flatMap(g => g.journal_tags || [])
    const tagFreq: Record<string, number> = {}
    allTags.forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1 })
    const topTags = Object.entries(tagFreq).sort(([, a], [, b]) => b - a).slice(0, 10).map(([t]) => t)

    // NO mindset injection (avoid bias)
    const systemPrompt = `You analyze 30 days of journal entries to determine if a user's philosophical mindset should evolve.

Available mindsets: stoic, existentialist, cynic, hedonist, samurai, scholar.

Return valid JSON:
{
  "shouldSuggest": boolean,
  "suggestedMindset": "string" or null,
  "reasoning": "string",
  "journalEvidence": "string",
  "transitionInsight": "string"
}

Rules:
- Only suggest a change if there is GENUINE evidence the user has naturally drifted toward another philosophy
- If their current mindset still fits, set shouldSuggest to false
- Be conservative — most users should NOT get a suggestion
- The suggestedMindset must be different from their current mindset
- Return valid JSON only`

    const completion = await getGroq().chat.completions.create({
      model: DEEP_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Current mindset: ${prefs.mindset}\nTop journal themes: ${topTags.join(', ')}\n\nJournal sample:\n${journalSample}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.5,
    })

    const raw = completion.choices[0]?.message?.content?.trim() || ''

    let result = null
    try {
      const parsed = JSON.parse(raw)
      if (parsed.shouldSuggest && parsed.suggestedMindset && parsed.suggestedMindset !== prefs.mindset) {
        result = {
          shouldSuggest: true,
          suggestedMindset: parsed.suggestedMindset,
          reasoning: parsed.reasoning || '',
          journalEvidence: parsed.journalEvidence || '',
          transitionInsight: parsed.transitionInsight || '',
        }
      }
    } catch {
      // Parse failed, no suggestion
    }

    // Cache result
    try {
      if (result) {
        await prisma.dailyGuide.upsert({
          where: { user_id_date: { user_id: user.id, date: today } },
          update: { ai_mindset_suggestion: JSON.stringify(result) },
          create: {
            user_id: user.id,
            date: today,
            day_type: 'work',
            ai_mindset_suggestion: JSON.stringify(result),
          },
        })

        await prisma.userPreferences.update({
          where: { user_id: user.id },
          data: { mindset_suggestion_shown_at: new Date() },
        })
      }
    } catch {
      // Non-fatal
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Mindset evolution error:', error)
    return NextResponse.json(null)
  }
}
