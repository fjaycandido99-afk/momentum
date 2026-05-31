/* ============================================================================
   Community access gate.

   Community is staged behind an allow-list while the feature is still
   being polished. Until it's broadly enabled, only the emails in
   COMMUNITY_ALLOWED_EMAILS see ANY of:
     - the /community, /community/:mindset feed pages
     - the /post/:id detail page (community share targets)
     - the /user/:handle profile pages
     - the share-to-Community buttons on Daily Wisdom, Quote of the Day,
       Saved items, journal "Save & Share" toggle, ShareToCommunityButton
     - the bottom-nav / desktop-dock Community link
     - every /api/social/* route (404 for non-allowed)

   Adding/removing emails is a one-line edit here — no migration, no
   env var rebuild.

   Server use: `await assertCommunityAccess()` at the top of an API
   route; it returns either { ok: true, userId } or { ok: false,
   response: NextResponse } so the caller just `if (!a.ok) return
   a.response`.

   Client use: `useCommunityAccess()` (see hooks/useCommunityAccess.ts).
   ============================================================================ */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Allow-list. Lowercased before comparison. Add an email here and
 * push to grant access; remove and push to revoke.
 */
const COMMUNITY_ALLOWED_EMAILS: ReadonlyArray<string> = [
  'fjaycandido99@gmail.com',
]

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false
  return COMMUNITY_ALLOWED_EMAILS.includes(email.toLowerCase())
}

export interface AccessOk { ok: true; userId: string; email: string }
export interface AccessDenied { ok: false; response: NextResponse }

/**
 * Use at the top of an /api/social/* route:
 *
 *   const access = await assertCommunityAccess()
 *   if (!access.ok) return access.response
 *
 * Returns 404 (not 403) for non-allowed users so the gated endpoints
 * look exactly like missing routes to anyone poking around. Returns
 * 401 only for unauthenticated requests, which is the normal contract.
 */
export async function assertCommunityAccess(): Promise<AccessOk | AccessDenied> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  if (!isEmailAllowed(user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not found' }, { status: 404 }),
    }
  }
  return { ok: true, userId: user.id, email: user.email! }
}
