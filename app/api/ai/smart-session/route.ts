import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getGroq } from '@/lib/groq'
import { VALID_SOUNDSCAPE_IDS } from '@/components/home/home-types'

export const dynamic = 'force-dynamic'

const DEEP_MODEL = 'llama-3.3-70b-versatile'

// Valid content IDs the AI can reference
const VALID_SOUNDSCAPES = [...VALID_SOUNDSCAPE_IDS]
const VALID_GUIDES = ['breathing', 'affirmation', 'gratitude', 'sleep', 'anxiety']
const VALID_MUSIC = ['lofi', 'classical', 'piano', 'jazz', 'study', 'ambient']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check premium
    const subscription = await prisma.subscription.findUnique({
      where: { user_id: user.id },
    })
    const isPremium = subscription?.tier === 'premium' &&
      (subscription?.status === 'active' || subscription?.status === 'trialing')

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const { mood, availableMinutes, timeOfDay } = await request.json()

    // Check cache
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const guide = await prisma.dailyGuide.findUnique({
      where: {
        user_id_date: { user_id: user.id, date: today },
      },
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

    // Fetch user activity history (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)

    const recentGuides = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: { gte: weekAgo },
      },
      select: {
        music_genre_used: true,
        breath_done: true,
        morning_prime_done: true,
        movement_done: true,
        energy_level: true,
        mood_before: true,
      },
      orderBy: { date: 'desc' },
    })

    // Fetch user preferences
    let userPrefs = { activity_type: 'workout', content_focus: ['motivation', 'mindfulness'], voice_style: 'calm' }
    try {
      const prefs = await prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { activity_type: true, content_focus: true, voice_style: true },
      })
      if (prefs) {
        userPrefs = {
          activity_type: prefs.activity_type,
          content_focus: prefs.content_focus,
          voice_style: prefs.voice_style,
        }
      }
    } catch {
      // Non-fatal
    }

    const musicUsed = recentGuides.map(g => g.music_genre_used).filter(Boolean)
    const breathDone = recentGuides.filter(g => g.breath_done).length
    const avgEnergy = recentGuides.filter(g => g.energy_level).map(g => g.energy_level)

    const context = [
      mood ? `Current mood: ${mood}` : null,
      availableMinutes ? `Available time: ${availableMinutes} minutes` : null,
      timeOfDay ? `Time of day: ${timeOfDay}` : null,
      `Preferred activity: ${userPrefs.activity_type}`,
      `Content focus: ${userPrefs.content_focus.join(', ')}`,
      musicUsed.length > 0 ? `Recently played music: ${musicUsed.slice(0, 3).join(', ')}` : null,
      `Breathing sessions this week: ${breathDone}`,
      avgEnergy.length > 0 ? `Recent energy levels: ${avgEnergy.slice(0, 3).join(', ')}` : null,
    ].filter(Boolean).join('\n')

    const completion = await getGroq().chat.completions.create({
      model: DEEP_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a wellness session planner. Create a personalized session plan with 3-4 steps. Each step uses one of these content types:

Available soundscapes (type "soundscape"): ${VALID_SOUNDSCAPES.join(', ')}
Available voice guides (type "breathing"): ${VALID_GUIDES.join(', ')}
Available music genres (type "music"): ${VALID_MUSIC.join(', ')}
Motivation type: "motivation" (id can be "confidence", "discipline", "growth", "resilience")

Return a JSON array of steps. Each step must have:
- "type": one of "soundscape", "breathing", "music", "motivation"
- "id": a valid ID from the lists above
- "title": a short human-readable title for this step
- "durationMinutes": suggested duration (1-10 min)
- "reason": a brief explanation why this step fits (max 15 words)

Total duration should roughly match the user's available time. Vary the content types. Respond with a JSON array only.`,
        },
        {
          role: 'user',
          content: `Plan my session:\n${context}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    })

    const rawResponse = completion.choices[0]?.message?.content?.trim() || ''

    let steps: Array<{ type: string; id: string; title: string; durationMinutes: number; reason: string }> = []

    try {
      const parsed = JSON.parse(rawResponse)
      if (Array.isArray(parsed)) {
        steps = parsed.slice(0, 4).map(step => ({
          type: String(step.type || 'soundscape'),
          id: String(step.id || 'focus'),
          title: String(step.title || 'Session'),
          durationMinutes: Math.min(Math.max(Number(step.durationMinutes) || 3, 1), 15),
          reason: String(step.reason || '').substring(0, 80),
        }))
      }
    } catch {
      // Fallback session
      steps = [
        { type: 'breathing', id: 'breathing', title: 'Deep Breathing', durationMinutes: 3, reason: 'Center your mind first' },
        { type: 'soundscape', id: 'focus', title: 'Focus Soundscape', durationMinutes: 5, reason: 'Build concentration' },
        { type: 'music', id: 'lofi', title: 'Lo-Fi Music', durationMinutes: 5, reason: 'Maintain focus with beats' },
      ]
    }

    // Validate IDs
    const allValid = [...VALID_SOUNDSCAPES, ...VALID_GUIDES, ...VALID_MUSIC, 'confidence', 'discipline', 'growth', 'resilience']
    steps = steps.map(step => {
      if (!allValid.includes(step.id)) {
        // Replace with a default for the type
        switch (step.type) {
          case 'soundscape': step.id = 'focus'; break
          case 'breathing': step.id = 'breathing'; break
          case 'music': step.id = 'lofi'; break
          case 'motivation': step.id = 'confidence'; break
        }
      }
      return step
    })

    // Cache
    try {
      await prisma.dailyGuide.upsert({
        where: {
          user_id_date: { user_id: user.id, date: today },
        },
        update: { ai_session_plan: JSON.stringify(steps) },
        create: {
          user_id: user.id,
          date: today,
          day_type: 'work',
          ai_session_plan: JSON.stringify(steps),
        },
      })
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ steps, cached: false })
  } catch (error) {
    console.error('Smart session API error:', error)
    return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 })
  }
}
