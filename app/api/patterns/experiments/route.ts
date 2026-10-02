import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { loadExperiments, startExperiment, stopExperiment } from '@/lib/patterns/experiments-server'

export const dynamic = 'force-dynamic'

/** GET — their experiments: the active one, and finished ones with verdicts. */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json(await loadExperiments(user.id))
  } catch (error) {
    console.error('[experiments GET] error:', error)
    return NextResponse.json({ error: 'Could not load experiments' }, { status: 500 })
  }
}

/** POST { action: 'start', key } | { action: 'stop' } */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed } = rateLimit(`experiments:${user.id}`, { limit: 20, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => null)
    if (body?.action === 'start') {
      const r = await startExperiment(user.id, body?.key)
      if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 400 })
    } else if (body?.action === 'stop') {
      await stopExperiment(user.id)
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
    return NextResponse.json(await loadExperiments(user.id))
  } catch (error) {
    console.error('[experiments POST] error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}
