import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSessionContent, ActivityType } from '@/lib/ai/content-generator'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { activityType, duration, voiceStyle } = body as {
      activityType: ActivityType
      duration: number
      voiceStyle?: 'calm' | 'direct' | 'energetic'
    }

    if (!activityType || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: activityType, duration' },
        { status: 400 }
      )
    }

    const segments = await generateSessionContent(
      activityType,
      duration,
      voiceStyle || 'calm'
    )

    return NextResponse.json({ segments })
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
