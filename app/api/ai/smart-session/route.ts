import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq } from '@/lib/groq'
import { VALID_SOUNDSCAPE_IDS } from '@/components/home/home-types'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'

export const dynamic = 'force-dynamic'

const DEEP_MODEL = 'llama-3.3-70b-versatile'

// Valid content IDs the AI can reference
const VALID_SOUNDSCAPES = [...VALID_SOUNDSCAPE_IDS]
const VALID_GUIDES = ['breathing', 'affirmation', 'gratitude', 'sleep', 'anxiety']
const VALID_MUSIC = ['lofi', 'classical', 'piano', 'jazz', 'study', 'ambient', 'sleep']
const VALID_MOTIVATION = ['confidence', 'discipline', 'growth', 'resilience']

const ALL_VALID: Record<string, string[]> = {
  soundscape: VALID_SOUNDSCAPES,
  breathing: VALID_GUIDES,
  music: VALID_MUSIC,
  motivation: VALID_MOTIVATION,
}

interface SessionStep {
  type: string
  id: string
  title: string
  durationMinutes: number
  reason: string
  transitionNote?: string
}

const FALLBACK_STEPS: SessionStep[] = [
  { type: 'soundscape', id: 'rain', title: 'Gentle Rain', durationMinutes: 3, reason: 'Settle in', transitionNote: 'Start by grounding yourself...' },
  { type: 'breathing', id: 'breathing', title: 'Deep Breathing', durationMinutes: 3, reason: 'Center your mind', transitionNote: 'Now bring attention to your breath...' },
  { type: 'music', id: 'lofi', title: 'Lo-fi Beats', durationMinutes: 5, reason: 'Ease into focus', transitionNote: 'Let the rhythm carry you...' },
  { type: 'soundscape', id: 'forest', title: 'Forest Sounds', durationMinutes: 5, reason: 'Close peacefully', transitionNote: 'Gently return to stillness...' },
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check premium
    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const { mood, energy, availableMinutes, timeOfDay, intention } = await request.json()
    const isCustomMode = !!(mood && energy)
    const targetMinutes = availableMinutes || 15

    // Cache check (only for quick mode — custom always regenerates)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (!isCustomMode) {
      const guide = await prisma.dailyGuide.findUnique({
        where: { user_id_date: { user_id: user.id, date: today } },
        select: { ai_session_plan: true },
      })

      if (guide?.ai_session_plan) {
        try {
          const cached = JSON.parse(guide.ai_session_plan)
          return NextResponse.json({ steps: cached, cached: true })
        } catch {
          // Bad cache, regenerate
        }
      }
    }

    // Fetch user activity history (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)

    const [recentGuides, prefs] = await Promise.all([
      prisma.dailyGuide.findMany({
        where: { user_id: user.id, date: { gte: weekAgo } },
        select: { music_genre_used: true, breath_done: true, energy_level: true, mood_before: true },
        orderBy: { date: 'desc' },
      }),
      prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { activity_type: true, content_focus: true, voice_style: true },
      }),
    ])

    const mindset = await getUserMindset(user.id)

    // Build prompt based on mode
    let systemPrompt: string
    let userContent: string

    const contentLists = `Available content types and valid IDs:
- soundscape: ${VALID_SOUNDSCAPES.join(', ')}
- breathing (voice guides): ${VALID_GUIDES.join(', ')}
- music: ${VALID_MUSIC.join(', ')}
- motivation: ${VALID_MOTIVATION.join(', ')}`

    const jsonFormat = `Return valid JSON: { "steps": [{ "type": "soundscape|breathing|music|motivation", "id": "valid_id_from_above", "title": "human readable title", "durationMinutes": number, "reason": "why this step (max 15 words)", "transitionNote": "1-2 sentence bridge to next step" }] }
Only use valid IDs from the lists above. Return valid JSON only.`

    if (isCustomMode) {
      // Custom mode — emotional arc DJ style
      systemPrompt = `You are an emotional wellness DJ creating personalized audio sessions with intentional emotional arcs.

${contentLists}

${jsonFormat}

Rules:
- Create 4-8 steps totaling approximately ${targetMinutes} minutes
- Start where the user IS emotionally, then guide them where they WANT to be
- Build emotional arc: acknowledge → transition → transform → integrate
- Each transitionNote bridges the emotional journey between steps`

      userContent = `Current mood: ${mood}\nEnergy level: ${energy}\nAvailable time: ${targetMinutes} minutes${intention ? `\nIntention: ${intention}` : ''}`
    } else {
      // Quick mode — time-of-day based
      const musicUsed = recentGuides.map(g => g.music_genre_used).filter(Boolean)
      const breathDone = recentGuides.filter(g => g.breath_done).length
      const avgEnergy = recentGuides.filter(g => g.energy_level).map(g => g.energy_level)

      systemPrompt = `You are a wellness session planner. Create a personalized session plan with 3-5 steps.

${contentLists}

${jsonFormat}

Total duration should roughly match the user's available time. Vary the content types.`

      const context = [
        mood ? `Current mood: ${mood}` : null,
        `Available time: ${targetMinutes} minutes`,
        timeOfDay ? `Time of day: ${timeOfDay}` : null,
        prefs?.activity_type ? `Preferred activity: ${prefs.activity_type}` : null,
        prefs?.content_focus?.length ? `Content focus: ${prefs.content_focus.join(', ')}` : null,
        musicUsed.length > 0 ? `Recently played music: ${musicUsed.slice(0, 3).join(', ')}` : null,
        `Breathing sessions this week: ${breathDone}`,
        avgEnergy.length > 0 ? `Recent energy levels: ${avgEnergy.slice(0, 3).join(', ')}` : null,
      ].filter(Boolean).join('\n')

      userContent = `Plan my session:\n${context}`
    }

    const completion = await getGroq().chat.completions.create({
      model: DEEP_MODEL,
      messages: [
        { role: 'system', content: buildMindsetSystemPrompt(systemPrompt, mindset) },
        { role: 'user', content: userContent },
      ],
      max_tokens: 600,
      temperature: 0.7,
    })

    const raw = completion.choices[0]?.message?.content?.trim() || ''

    let steps: SessionStep[] = FALLBACK_STEPS
    try {
      const parsed = JSON.parse(raw)
      const arr = Array.isArray(parsed) ? parsed : parsed.steps
      if (Array.isArray(arr) && arr.length >= 3) {
        steps = arr.slice(0, 8).map((step: SessionStep) => {
          const validIds = ALL_VALID[step.type]
          if (!validIds) return { ...step, type: 'soundscape', id: 'rain' }
          if (!validIds.includes(step.id)) return { ...step, id: validIds[0] }
          return {
            type: step.type,
            id: step.id,
            title: String(step.title || 'Session').substring(0, 60),
            durationMinutes: Math.min(Math.max(Number(step.durationMinutes) || 3, 1), 15),
            reason: String(step.reason || '').substring(0, 80),
            transitionNote: step.transitionNote ? String(step.transitionNote).substring(0, 150) : undefined,
          }
        })
      }
    } catch {
      // Use fallback
    }

    // Cache (quick mode only)
    if (!isCustomMode) {
      try {
        await prisma.dailyGuide.upsert({
          where: { user_id_date: { user_id: user.id, date: today } },
          update: { ai_session_plan: JSON.stringify(steps) },
          create: { user_id: user.id, date: today, day_type: 'work', ai_session_plan: JSON.stringify(steps) },
        })
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({ steps, cached: false })
  } catch (error) {
    console.error('Smart session API error:', error)
    return NextResponse.json({ steps: FALLBACK_STEPS })
  }
}
