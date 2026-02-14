import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { DAILY_QUESTIONS } from '@/lib/daily-sparks'
import { QUOTES, getHeuristicQuote } from '@/lib/quotes'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { getWeightedQuestions } from '@/lib/daily-sparks'
import { getWeightedQuotePool } from '@/lib/mindset/quotes'
import { getRandomAffirmation } from '@/lib/mindset/affirmations'

export const dynamic = 'force-dynamic'

const SPARK_TYPES = ['question', 'quote', 'motivation', 'affirmation'] as const

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user context from today's daily guide
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const guide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: {
          user_id: user.id,
          date: today,
        },
      },
      select: {
        day_type: true,
        energy_level: true,
        mood_before: true,
        ai_affirmation: true,
      },
    })

    const hour = new Date().getHours()
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

    // Decide: ~35% AI-generated, ~65% smart pick from static pool
    const useAI = Math.random() < 0.35
    const sparkType = SPARK_TYPES[Math.floor(Math.random() * SPARK_TYPES.length)]

    // Affirmation type — path-based from user's mindset
    if (sparkType === 'affirmation') {
      const mindset = await getUserMindset(user.id)

      // If there's a cached AI affirmation for today, use it
      if (guide?.ai_affirmation) {
        return NextResponse.json({ type: 'affirmation', text: guide.ai_affirmation, ai: true })
      }

      // Otherwise pick from the mindset-specific static pool
      return NextResponse.json({ type: 'affirmation', text: getRandomAffirmation(mindset), ai: false })
    }

    if (useAI) {
      try {
        const sparkMindset = await getUserMindset(user.id)
        const context = [
          guide?.day_type ? `Day type: ${guide.day_type}` : null,
          guide?.energy_level ? `Energy level: ${guide.energy_level}` : null,
          guide?.mood_before ? `Current mood: ${guide.mood_before}` : null,
          `Time of day: ${timeOfDay}`,
        ].filter(Boolean).join('. ')

        let systemPrompt: string

        if (sparkType === 'question') {
          systemPrompt = `You are a thoughtful wellness companion. Generate a single short reflective question (1 sentence, max 15 words). It should feel warm, personal, and thought-provoking. No preamble, just the question. ${context ? `Context: ${context}` : ''}`
        } else if (sparkType === 'quote') {
          systemPrompt = `You are a wellness companion. Share a single real, well-known inspirational quote (1-2 sentences) with its author. Format exactly as: "quote text" — Author Name. Pick something relevant to the user's current state. No preamble. ${context ? `Context: ${context}` : ''}`
        } else {
          systemPrompt = `You are a warm wellness companion. Generate a single short motivational spark (1 sentence, max 15 words). It should feel encouraging and personal — like a gentle nudge from a friend. No preamble. ${context ? `Context: ${context}` : ''}`
        }

        const completion = await getGroq().chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: buildMindsetSystemPrompt(systemPrompt, sparkMindset) },
            { role: 'user', content: `Give me a ${sparkType === 'question' ? 'reflective question' : sparkType === 'quote' ? 'quote' : 'motivational spark'} for right now.` },
          ],
          max_tokens: 80,
          temperature: 0.9,
        })

        const raw = completion.choices[0]?.message?.content?.trim()
        if (raw) {
          // Parse quote format: "text" — Author
          if (sparkType === 'quote') {
            const cleaned = raw.replace(/^[\s""\u201C\u201D]+/, '').replace(/[\s""\u201C\u201D]+$/, '')
            const dashIdx = cleaned.search(/\s[—\u2014\u2013–-]\s/)
            if (dashIdx > 0) {
              const text = cleaned.slice(0, dashIdx).trim()
              const author = cleaned.slice(dashIdx).replace(/^[\s—\u2014\u2013–-]+/, '').trim()
              if (text && author) {
                return NextResponse.json({
                  type: 'quote',
                  text,
                  author,
                  ai: true,
                })
              }
            }
          }
          return NextResponse.json({
            type: sparkType === 'question' ? 'question' : sparkType === 'quote' ? 'quote' : 'motivation',
            text: raw.replace(/^["\u201C\u201D]|["\u201C\u201D]$/g, ''),
            ai: true,
          })
        }
      } catch {
        // AI failed, fall through to smart pick
      }
    }

    // Fetch mindset for static pool weighting
    const userMindset = await getUserMindset(user.id)
    const weightedQuestionPool = getWeightedQuestions(userMindset)
    const weightedQuotePool = getWeightedQuotePool(userMindset, QUOTES, 3)

    // Smart pick from static pool based on context
    if (sparkType === 'question' || sparkType === 'motivation') {
      // Map context to question categories
      const categoryWeights: Record<string, string[]> = {
        morning: ['Forward-looking', 'Gratitude', 'Growth'],
        afternoon: ['Self-awareness', 'Connection', 'Growth'],
        evening: ['Gratitude', 'Self-awareness', 'Playful'],
      }

      const moodWeights: Record<string, string[]> = {
        low: ['Gratitude', 'Connection'],
        okay: ['Growth', 'Forward-looking'],
        good: ['Playful', 'Growth'],
        great: ['Forward-looking', 'Connection'],
      }

      const preferred = [
        ...(categoryWeights[timeOfDay] || []),
        ...(guide?.mood_before ? (moodWeights[guide.mood_before] || []) : []),
      ]

      // Questions are grouped by category comments — pick from a relevant range
      const categoryRanges: Record<string, [number, number]> = {
        'Forward-looking': [0, 4],
        'Gratitude': [5, 9],
        'Self-awareness': [10, 14],
        'Connection': [15, 18],
        'Growth': [19, 23],
        'Playful': [24, 29],
      }

      if (preferred.length > 0) {
        const cat = preferred[Math.floor(Math.random() * preferred.length)]
        const range = categoryRanges[cat]
        if (range) {
          const idx = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1))
          if (idx < DAILY_QUESTIONS.length) {
            return NextResponse.json({
              type: 'question',
              text: DAILY_QUESTIONS[idx],
              ai: false,
            })
          }
        }
      }

      // Fallback: random question (mindset-weighted)
      const q = weightedQuestionPool[Math.floor(Math.random() * weightedQuestionPool.length)]
      return NextResponse.json({ type: 'question', text: q, ai: false })
    }

    // Smart quote pick based on mood/energy (uses shared heuristic from quotes.ts)
    const pick = getHeuristicQuote(guide?.mood_before ?? undefined, guide?.energy_level ?? undefined, weightedQuotePool)
    return NextResponse.json({ type: 'quote', text: pick.text, author: pick.author, ai: false })
  } catch (error) {
    console.error('Spark API error:', error)
    return NextResponse.json({ error: 'Failed to generate spark' }, { status: 500 })
  }
}
