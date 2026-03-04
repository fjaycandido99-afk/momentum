/**
 * Fetch wrapper that attaches the Supabase access token as a Bearer header.
 * Fixes native WebView (Capacitor) where cookies may not be sent to the server.
 * Falls back to regular fetch if no session exists.
 */
import { createClient } from '@/lib/supabase/client'

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.access_token) {
      const headers = new Headers(init?.headers)
      // Only set if not already present (e.g. CRON_SECRET routes)
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${session.access_token}`)
      }
      return fetch(input, { ...init, headers })
    }
  } catch {
    // Fall through to regular fetch
  }

  return fetch(input, init)
}
