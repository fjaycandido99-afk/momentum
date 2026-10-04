import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadEraTimeline } from '@/lib/era/timeline'

export const dynamic = 'force-dynamic'

/** GET — every era they've run, oldest first (lib/era/timeline). */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ eras: await loadEraTimeline(user.id) })
  } catch (error) {
    console.error('[eras timeline] error:', error)
    return NextResponse.json({ error: 'Could not load your eras' }, { status: 500 })
  }
}
