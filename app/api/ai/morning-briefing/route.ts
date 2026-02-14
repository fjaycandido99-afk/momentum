import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isPremiumUser } from '@/lib/subscription-check'
import { getGroq, GROQ_MODEL } from '@/lib/groq'
import { getUserMindset } from '@/lib/mindset/get-user-mindset'
import { buildMindsetSystemPrompt } from '@/lib/mindset/prompt-builder'
import { TONE_VOICES } from '@/lib/daily-guide/audio-utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isPremium = await isPremiumUser(user.id)

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    // Check cache
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayGuide = await prisma.dailyGuide.findUnique({
      where: { user_id_date: { user_id: user.id, date: today } },
      select: {
        ai_morning_briefing_script: true,
        ai_morning_briefing_audio: true,
      },
    })

    if (todayGuide?.ai_morning_briefing_script) {
      return NextResponse.json({
        script: todayGuide.ai_morning_briefing_script,
        audio: todayGuide.ai_morning_briefing_audio || null,
        cached: true,
      })
    }

    // Gather context
    const [prefs, yesterday, goals] = await Promise.all([
      prisma.userPreferences.findUnique({
        where: { user_id: user.id },
        select: { current_streak: true, guide_tone: true },
      }),
      prisma.dailyGuide.findFirst({
        where: {
          user_id: user.id,
          date: { lt: today },
        },
        orderBy: { date: 'desc' },
        select: {
          journal_win: true,
          ai_affirmation: true,
          journal_mood: true,
        },
      }),
      prisma.goal.findMany({
        where: { user_id: user.id, status: 'active' },
        select: { title: true, current_count: true, target_count: true },
        take: 3,
      }),
    ])

    const todayAffirmation = await prisma.dailyGuide.findUnique({
      where: { user_id_date: { user_id: user.id, date: today } },
      select: { ai_affirmation: true },
    })

    const mindset = await getUserMindset(user.id)
    const streak = prefs?.current_streak || 0

    const basePrompt = `You are a personal morning briefing host. Write a 150-200 word spoken-word script for a 60-90 second audio briefing.

Structure:
1. Warm, personal greeting (use "you", not names)
2. Today's intention or affirmation
3. Yesterday's win callback (if available)
4. Goal check-in (brief, encouraging)
5. Streak acknowledgment (if > 1)
6. Closing energy boost

Style: Conversational, warm, like a trusted friend. Write for spoken delivery — short sentences, natural pauses (use "..." for pause). No headers or formatting.`

    const contextParts = [
      todayAffirmation?.ai_affirmation ? `Today's affirmation: "${todayAffirmation.ai_affirmation}"` : null,
      yesterday?.journal_win ? `Yesterday's win: "${yesterday.journal_win}"` : null,
      yesterday?.journal_mood ? `Yesterday's mood: ${yesterday.journal_mood}` : null,
      goals.length > 0 ? `Active goals: ${goals.map(g => `${g.title} (${g.current_count}/${g.target_count})`).join(', ')}` : null,
      streak > 1 ? `Current streak: ${streak} days` : null,
    ].filter(Boolean).join('\n')

    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: buildMindsetSystemPrompt(basePrompt, mindset) },
        { role: 'user', content: contextParts || 'Generate a general morning briefing.' },
      ],
      max_tokens: 350,
      temperature: 0.8,
    })

    const script = completion.choices[0]?.message?.content?.trim() || ''

    if (!script) {
      return NextResponse.json({
        script: todayAffirmation?.ai_affirmation || 'Start your morning with intention. You have everything you need.',
        audio: null,
        fallback: true,
      })
    }

    // Generate TTS audio
    let audioBase64: string | null = null
    const apiKey = process.env.ELEVENLABS_API_KEY
    const tone = prefs?.guide_tone || 'calm'
    const voiceId = TONE_VOICES[tone] || TONE_VOICES.calm

    if (apiKey) {
      try {
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: script,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { stability: 0.6, similarity_boost: 0.75 },
          }),
        })

        if (ttsResponse.ok) {
          const buffer = await ttsResponse.arrayBuffer()
          audioBase64 = Buffer.from(buffer).toString('base64')
        }
      } catch (ttsError) {
        console.error('TTS error (non-fatal):', ttsError)
      }
    }

    // Cache
    try {
      await prisma.dailyGuide.upsert({
        where: { user_id_date: { user_id: user.id, date: today } },
        update: {
          ai_morning_briefing_script: script,
          ...(audioBase64 ? { ai_morning_briefing_audio: audioBase64 } : {}),
        },
        create: {
          user_id: user.id,
          date: today,
          day_type: 'work',
          ai_morning_briefing_script: script,
          ai_morning_briefing_audio: audioBase64,
        },
      })
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      script,
      audio: audioBase64,
      cached: false,
    })
  } catch (error) {
    console.error('Morning briefing error:', error)
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 })
  }
}
