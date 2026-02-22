import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq } from '@/lib/groq'
import { VALID_SOUNDSCAPE_IDS } from '@/components/home/home-types'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { rateLimit } from '@/lib/rate-limit'

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
  { type: 'soundscape', id: 'rain', title: 'Gentle Rain', durationMinutes: 5, reason: 'Settle in', transitionNote: 'Start by grounding yourself...' },
  { type: 'breathing', id: 'breathing', title: 'Deep Breathing', durationMinutes: 5, reason: 'Center your mind', transitionNote: 'Now bring attention to your breath...' },
  { type: 'music', id: 'lofi', title: 'Lo-fi Beats', durationMinutes: 10, reason: 'Ease into focus', transitionNote: 'Let the rhythm carry you...' },
  { type: 'soundscape', id: 'forest', title: 'Forest Sounds', durationMinutes: 5, reason: 'Close peacefully', transitionNote: 'Gently return to stillness...' },
]

const PRESETS: Record<string, { mood: string; energy: string; intention: string; minutes: number }> = {
  'wind-down': { mood: 'tired', energy: 'low', intention: 'relax and prepare for sleep', minutes: 15 },
  'morning-energy': { mood: 'calm', energy: 'medium', intention: 'energize for the day', minutes: 10 },
  'focus-mode': { mood: 'focused', energy: 'medium', intention: 'deep concentration', minutes: 20 },
  'stress-relief': { mood: 'stressed', energy: 'high', intention: 'calm down and reset', minutes: 15 },
  'quick-reset': { mood: 'anxious', energy: 'medium', intention: 'quick mental reset', minutes: 5 },
}

const MOOD_MAP: Record<string, number> = { awful: 1, low: 2, okay: 3, good: 4, great: 5 }

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit(`ai-smart-session:${user.id}`, { limit: 10, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Check premium
    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const body = await request.json()
    const presetDefaults = body.preset ? PRESETS[body.preset] : null
    const mood = body.mood || presetDefaults?.mood
    const energy = body.energy || presetDefaults?.energy
    const intention = body.intention || presetDefaults?.intention
    const availableMinutes = body.availableMinutes || presetDefaults?.minutes
    const timeOfDay = body.timeOfDay
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

    const [recentGuides, prefs, favorites, goals, todayGuide] = await Promise.all([
      prisma.dailyGuide.findMany({
        where: { user_id: user.id, date: { gte: weekAgo } },
        select: {
          music_genre_used: true, breath_done: true, energy_level: true,
          mood_before: true, mood_after: true, journal_mood: true,
          day_type: true, movement_done: true,
        },
        orderBy: { date: 'desc' },
      }),
      prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: {
          activity_type: true, content_focus: true, voice_style: true,
          preferred_music_genre: true, current_streak: true,
          guide_tone: true, wellness_score_7day_avg: true,
        },
      }),
      prisma.favoriteContent.findMany({
        where: { user_id: user.id },
        select: { content_type: true, content_id: true, content_genre: true },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
      prisma.goal.findMany({
        where: { user_id: user.id, status: 'active' },
        select: { title: true, current_count: true, target_count: true },
        take: 5,
      }),
      prisma.dailyGuide.findUnique({
        where: { user_id_date: { user_id: user.id, date: today } },
        select: { journal_mood: true, mood_before: true, energy_level: true, day_type: true },
      }),
    ])

    const mindset = await getUserMindset(user.id)

    // Build prompt based on mode
    let systemPrompt: string
    let userContent: string

    const contentLists = `Available content types, valid IDs, and typical durations:
- soundscape (ambient loops, continuous): ${VALID_SOUNDSCAPES.join(', ')} — suggest 5-10 min
- breathing (guided voice exercises): ${VALID_GUIDES.join(', ')} — suggest 5 min (fixed-length guided sessions)
- music (streaming playlists, continuous): ${VALID_MUSIC.join(', ')} — suggest 8-15 min
- motivation (video speeches): ${VALID_MOTIVATION.join(', ')} — suggest 5-8 min per video`

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
      // Quick mode — context-aware
      const musicUsed = recentGuides.map(g => g.music_genre_used).filter(Boolean)
      const breathDone = recentGuides.filter(g => g.breath_done).length
      const avgEnergy = recentGuides.filter(g => g.energy_level).map(g => g.energy_level)

      // Mood trend from recent journal entries
      const moodValues = recentGuides
        .map(g => MOOD_MAP[g.journal_mood || ''] || 0)
        .filter(v => v > 0)
      const moodTrend = moodValues.length >= 3
        ? (moodValues[0] > moodValues[moodValues.length - 1] ? 'improving' : moodValues[0] < moodValues[moodValues.length - 1] ? 'declining' : 'stable')
        : 'insufficient data'

      systemPrompt = `You are a wellness session planner. Create a personalized session plan with 3-5 steps.

${contentLists}

${jsonFormat}

Rules:
- Total duration should roughly match the user's available time
- Vary the content types for a balanced session
- Prioritize the user's favorite content types when possible
- If mood is low or declining, lead with calming/grounding content
- If energy is low, avoid intense motivation; use gentle soundscapes first
- If user has active goals, frame session as supporting their goals
- Vary content from what they recently played`

      const context = [
        `Time of day: ${timeOfDay || 'unknown'}`,
        `Available time: ${targetMinutes} minutes`,
        todayGuide?.journal_mood ? `Today's mood: ${todayGuide.journal_mood}` : null,
        todayGuide?.energy_level ? `Current energy: ${todayGuide.energy_level}` : null,
        todayGuide?.day_type ? `Day type: ${todayGuide.day_type}` : null,
        prefs?.preferred_music_genre ? `Favorite music genre: ${prefs.preferred_music_genre}` : null,
        prefs?.guide_tone ? `Preferred tone: ${prefs.guide_tone}` : null,
        prefs?.current_streak ? `Current streak: ${prefs.current_streak} days` : null,
        prefs?.wellness_score_7day_avg ? `7-day wellness score: ${prefs.wellness_score_7day_avg}/100` : null,
        prefs?.activity_type ? `Preferred activity: ${prefs.activity_type}` : null,
        prefs?.content_focus?.length ? `Content focus: ${prefs.content_focus.join(', ')}` : null,
        favorites.length > 0 ? `Favorite content: ${[...new Set(favorites.map(f => f.content_id || f.content_genre).filter(Boolean))].slice(0, 5).join(', ')}` : null,
        goals.length > 0 ? `Active goals: ${goals.map(g => `${g.title} (${g.current_count}/${g.target_count})`).join(', ')}` : null,
        musicUsed.length > 0 ? `Recently played: ${musicUsed.slice(0, 3).join(', ')}` : null,
        `Breathing sessions this week: ${breathDone}`,
        avgEnergy.length > 0 ? `Recent energy levels: ${avgEnergy.slice(0, 3).join(', ')}` : null,
        moodValues.length >= 3 ? `Mood trend: ${moodTrend}` : null,
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
            durationMinutes: Math.min(Math.max(Number(step.durationMinutes) || 5, 3), 15),
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
