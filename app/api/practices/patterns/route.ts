import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadPracticePatterns } from '@/lib/practices/patterns-server'

export const dynamic = 'force-dynamic'

/**
 * GET — what Voxu has noticed about how someone keeps their disciplines.
 *
 * Its own endpoint rather than part of /api/practices, because that payload
 * is fetched on the home screen and this needs a three-month window. Home
 * shouldn't pay for a panel that only exists on /training.
 *
 * Free on every tier: it is a description of their own behaviour.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ patterns: [], pending: null })

    return NextResponse.json(await loadPracticePatterns(user.id))
  } catch (error) {
    console.error('[practice patterns GET] error:', error)
    // A missing panel is a better failure than a broken page.
    return NextResponse.json({ patterns: [], pending: null })
  }
}
