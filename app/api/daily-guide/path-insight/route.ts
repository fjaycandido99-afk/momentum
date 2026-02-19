import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_DETAILS } from '@/lib/mindset/detail-content'

export const dynamic = 'force-dynamic'

// Fallback insights per mindset when AI is unavailable
const FALLBACK_INSIGHTS: Record<MindsetId, Array<{ text: string; theme: string; affirmation: string }>> = {
  stoic: [
    { text: 'Focus on what lies within your power today. External events are beyond your control, but your response to them defines your character.', theme: 'Inner Strength', affirmation: 'I control my responses, not my circumstances.' },
    { text: 'Every obstacle you face today is training for your character. Embrace difficulty as the raw material for growth.', theme: 'Resilience', affirmation: 'What stands in the way becomes the way.' },
    { text: 'Today, practice the art of acceptance. Not passive resignation, but the active choice to focus your energy where it matters most.', theme: 'Acceptance', affirmation: 'I direct my energy toward what I can change.' },
  ],
  existentialist: [
    { text: 'You are free to choose who you become today. No past mistake, no external pressure — only the authentic choice you make right now.', theme: 'Radical Freedom', affirmation: 'I am the author of my own story.' },
    { text: 'Meaning is not found — it is created. Today is a blank page waiting for your ink.', theme: 'Meaning-Making', affirmation: 'I create meaning through my choices.' },
    { text: 'The absurdity of life is not a burden but a liberation. When nothing is predetermined, everything is possible.', theme: 'Embracing Absurdity', affirmation: 'I find freedom in life\'s openness.' },
  ],
  cynic: [
    { text: 'Strip away one unnecessary thing today. The less you need, the freer you become. What are you carrying that serves no purpose?', theme: 'Radical Simplicity', affirmation: 'I need less than I think.' },
    { text: 'Question one assumption you hold today. The conventions others follow without thinking may be chains disguised as comfort.', theme: 'Truth-Seeking', affirmation: 'I see through illusions clearly.' },
    { text: 'Speak one truth today that others avoid. Honesty is the shortest path to freedom.', theme: 'Parrhesia', affirmation: 'I speak my truth without fear.' },
  ],
  hedonist: [
    { text: 'Notice one simple pleasure today that you normally rush past. A warm drink, sunlight on your skin, a moment of quiet. This is where true joy lives.', theme: 'Simple Pleasures', affirmation: 'I savor the beauty in ordinary moments.' },
    { text: 'Today, distinguish between desires that bring lasting contentment and those that leave you wanting more. True pleasure is sustainable.', theme: 'Wise Pleasure', affirmation: 'I choose joy that nourishes my soul.' },
    { text: 'Reach out to someone who matters to you today. Friendship, Epicurus taught, is the greatest wealth a life can hold.', theme: 'Deep Connection', affirmation: 'My relationships are my greatest treasure.' },
  ],
  samurai: [
    { text: 'Approach one task today with total presence. No distraction, no hesitation — just you and the work before you. This is training.', theme: 'Mushin', affirmation: 'I am fully present in this moment.' },
    { text: 'Small improvements compound into mastery. What one skill will you sharpen today? The way is in training.', theme: 'Kaizen', affirmation: 'I grow stronger with each day of practice.' },
    { text: 'Let discipline be your freedom today. Structure does not confine — it creates the foundation for limitless potential.', theme: 'Discipline', affirmation: 'My discipline creates my freedom.' },
  ],
  scholar: [
    { text: 'The unconscious mind speaks in symbols and dreams. Pay attention to the images that arise unbidden today — they carry wisdom your rational mind may have missed.', theme: 'The Unconscious', affirmation: 'I listen to the wisdom beneath the surface.' },
    { text: 'Your shadow is not your enemy — it is the unlived life waiting to be integrated. What quality have you been denying? It holds a gift for you.', theme: 'Shadow Work', affirmation: 'I embrace all parts of myself.' },
    { text: 'Synchronicity is the universe arranging meaningful coincidences. Stay alert today — the patterns you notice are invitations from the deeper self.', theme: 'Synchronicity', affirmation: 'I trust the meaningful connections I discover.' },
  ],
  manifestor: [
    { text: 'Your imagination is not fantasy — it is a preview of what is coming. Spend time today feeling into the reality you want as if it already exists.', theme: 'Creative Visualization', affirmation: 'I live in the feeling of my wish fulfilled.' },
    { text: 'Resistance is the only thing between you and your desire. Today, release the doubt, the worry, the "how." Trust that the bridge of incidents is forming.', theme: 'Letting Go', affirmation: 'I release resistance and allow my good to flow.' },
    { text: 'You do not attract what you want — you attract what you are. Align your inner state with your desire today. Feel abundant before abundance arrives.', theme: 'Energetic Alignment', affirmation: 'I am already the person who has what I desire.' },
  ],
  hustler: [
    { text: 'Nobody owes you anything. Your results are a direct reflection of your effort. Today, close the gap between where you are and where you want to be through pure execution.', theme: 'Extreme Ownership', affirmation: 'I own every outcome in my life.' },
    { text: 'Motivation is unreliable. Discipline is not. Stop waiting to feel like it and go do the work. The feeling follows the action, not the other way around.', theme: 'Discipline Over Motivation', affirmation: 'I do not negotiate with weakness.' },
    { text: 'The person you want to become is on the other side of the hard things you keep avoiding. Do the thing you are resisting most — that is where the growth is.', theme: 'Embrace the Suck', affirmation: 'I am built for the hard things.' },
  ],
}

interface PathInsight {
  text: string
  theme: string
  affirmation: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const mindsetParam = searchParams.get('mindset') as MindsetId | null

    // Determine the mindset
    let mindsetId: MindsetId = 'stoic'
    if (user) {
      mindsetId = await getUserMindset(user.id)
    }
    if (mindsetParam && mindsetParam in FALLBACK_INSIGHTS) {
      mindsetId = mindsetParam
    }

    // Get today's date key
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateKey = today.toISOString().split('T')[0]

    // Check for cached insight
    if (user) {
      const guide = await prisma.dailyGuide.findUnique({
        where: {
          user_id_date: {
            user_id: user.id,
            date: new Date(dateKey),
          },
        },
        select: {
          path_insight_script: true,
        },
      })

      if (guide?.path_insight_script) {
        try {
          const cached = JSON.parse(guide.path_insight_script)
          return NextResponse.json({ insight: cached, cached: true })
        } catch {
          // Invalid JSON, regenerate
        }
      }
    }

    // Generate new path insight
    let insight: PathInsight
    const details = MINDSET_DETAILS[mindsetId]

    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY not set')
      }

      const basePrompt = `You are a philosophical guide providing daily insights. Your role is to offer a brief, grounded, practical insight for the day.

Figure: ${details.figureName} (${details.figureTitle})
Core Quote: "${details.quote}"

Generate a daily insight with:
1. "text": A 2-3 sentence insight grounded in this philosophy (speak directly, no "As a follower of..." — practical and relatable)
2. "theme": A 2-3 word theme label (e.g., "Inner Strength", "Radical Freedom")
3. "affirmation": A short, first-person affirmation aligned with this philosophy

Respond ONLY with valid JSON:
{"text": "...", "theme": "...", "affirmation": "..."}`

      const systemPrompt = buildMindsetSystemPrompt(basePrompt, mindsetId)

      const completion = await getGroq().chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate today's ${details.figureName}-inspired insight.` },
        ],
        max_tokens: 200,
        temperature: 0.85,
      })

      const content = completion.choices[0]?.message?.content
      if (!content) throw new Error('No response')

      const parsed = JSON.parse(content.trim())
      insight = {
        text: parsed.text || details.quote,
        theme: parsed.theme || 'Daily Wisdom',
        affirmation: parsed.affirmation || 'I walk my path with clarity.',
      }
    } catch (error) {
      console.error('Path insight generation error:', error)
      const fallbacks = FALLBACK_INSIGHTS[mindsetId]
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
      insight = fallbacks[dayOfYear % fallbacks.length]
    }

    // Cache for logged-in users
    if (user) {
      try {
        await prisma.dailyGuide.upsert({
          where: {
            user_id_date: {
              user_id: user.id,
              date: new Date(dateKey),
            },
          },
          update: {
            path_insight_script: JSON.stringify(insight),
          },
          create: {
            user_id: user.id,
            date: new Date(dateKey),
            day_type: 'work',
            path_insight_script: JSON.stringify(insight),
          },
        })
      } catch (cacheError) {
        console.error('Failed to cache path insight:', cacheError)
      }
    }

    return NextResponse.json({ insight, cached: false })
  } catch (error) {
    console.error('Path insight API error:', error)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
    const fallback = FALLBACK_INSIGHTS.stoic[dayOfYear % FALLBACK_INSIGHTS.stoic.length]
    return NextResponse.json({ insight: fallback, cached: false, fallback: true })
  }
}
