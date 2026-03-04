'use client'

/**
 * Global fetch interceptor that automatically attaches the Supabase access token
 * as a Bearer header to all /api/ calls. This fixes native WebView (Capacitor)
 * where cookies may not be sent to the server.
 *
 * Call installAuthInterceptor() once at app startup (e.g. in AppWrapper).
 */
import { createClient } from '@/lib/supabase/client'

let installed = false

export function installAuthInterceptor() {
  if (installed || typeof window === 'undefined') return
  installed = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    // Only intercept relative /api/ calls (our server routes)
    if (!url.startsWith('/api/')) {
      return originalFetch(input, init)
    }

    try {
      const headers = new Headers(init?.headers)
      // Don't overwrite if already set (e.g. CRON_SECRET routes)
      if (!headers.has('Authorization')) {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`)
          return originalFetch(input, { ...init, headers })
        }
      }
    } catch {
      // Fall through to regular fetch
    }

    return originalFetch(input, init)
  }
}
