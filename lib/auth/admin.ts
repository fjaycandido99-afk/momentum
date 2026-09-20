import { createClient } from '@/lib/supabase/server'

/**
 * Who may see the owner's dashboard (/admin).
 *
 * Signed-in accounts rather than a shared key: a key in a URL ends up in
 * browser history, screenshots and pasted links, and Voxu's key is the
 * CRON_SECRET, which also unlocks the cron endpoints. A session can be
 * revoked by signing out; a leaked key has to be rotated everywhere.
 *
 * Configure with ADMIN_EMAILS (comma-separated) or ADMIN_OWNER_EMAIL, which
 * already exists for alert mail. The built-in fallback is the owner's own
 * address, so the page works before any variable is set — nothing else is
 * granted by default, and a review or demo account is never an admin.
 */

const FALLBACK_ADMINS = ['fjaycandido99@gmail.com']

function adminList(): string[] {
  const configured = [process.env.ADMIN_EMAILS, process.env.ADMIN_OWNER_EMAIL]
    .filter((v): v is string => !!v)
    .flatMap(v => v.split(','))
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return configured.length > 0 ? configured : FALLBACK_ADMINS
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminList().includes(email.trim().toLowerCase())
}

/**
 * The signed-in admin, or null. Null covers every failure the same way —
 * not signed in, signed in as someone else, auth unavailable — because the
 * caller must treat them identically: show nothing.
 */
export async function currentAdmin(): Promise<{ id: string; email: string } | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email || !isAdminEmail(user.email)) return null
    return { id: user.id, email: user.email }
  } catch {
    return null
  }
}
