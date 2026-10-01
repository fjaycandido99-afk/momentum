import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { saveEraReflection } from '@/lib/era/record-server'
import { checkAchievementsNow } from '@/lib/achievements-server'

export const dynamic = 'force-dynamic'

/** POST { eraId, text } — the one line kept on an era's record. Empty clears it. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`era-reflection:${user.id}`, { limit: 10, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const result = await saveEraReflection(user.id, body?.eraId, body?.text)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    const newAchievements = result.reflection ? await checkAchievementsNow(user.id) : []
    return NextResponse.json({ reflection: result.reflection, newAchievements })
  } catch (error) {
    console.error('[era reflection] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}
