/**
 * GET /api/social/access — small "am I allowed" probe used by the
 * client-side useCommunityAccess hook to decide whether to render the
 * Community nav link, share-to-Community buttons, journal toggles, etc.
 *
 * Always returns 200; the `enabled` boolean tells the caller. Guests
 * and disallowed users get { enabled: false }.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isEmailAllowed } from '@/lib/social/access'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const enabled = isEmailAllowed(user?.email)
    return NextResponse.json(
      { enabled },
      {
        // Cache only briefly per-user; access changes when the allow-list
        // is updated + redeployed, which already invalidates everything.
        headers: { 'Cache-Control': 'private, max-age=60' },
      },
    )
  } catch (err) {
    console.error('[social/access GET] error:', err)
    return NextResponse.json({ enabled: false }, { status: 200 })
  }
}
