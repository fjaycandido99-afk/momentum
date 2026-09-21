import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadProofYear } from '@/lib/proof/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/proof?year=2026 — the year in proof: a day-by-day record of the
 * promises kept, and what was going on around each one.
 *
 * Their own history, so it needs their session and nothing else. Free on
 * every tier (see lib/proof/server.ts).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const raw = request.nextUrl.searchParams.get('year')
    const year = raw && /^\d{4}$/.test(raw) ? Number(raw) : undefined
    const payload = await loadProofYear(user.id, year)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[proof GET] error:', error)
    return NextResponse.json({ error: 'Could not load your record' }, { status: 500 })
  }
}
