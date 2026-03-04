import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'

// Fallback values (these are public keys, safe to include)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jkrpreixylczfdfdyxrm.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprcnByZWl4eWxjemZkZmR5eHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODEzNDUsImV4cCI6MjA4NDI1NzM0NX0.dsOQiI2OtpmqYsFEPEgW0B0s_JiJ7ffg8Hn5b3iHm0A'

export async function createClient() {
  // Check for Bearer token first (native WebView fallback where cookies may not work)
  try {
    const headerStore = await headers()
    const authHeader = headerStore.get('authorization')
    if (authHeader?.startsWith('Bearer ') && !authHeader.includes(process.env.CRON_SECRET || '__none__')) {
      const token = authHeader.slice(7)
      const client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      // Verify the token is a valid Supabase JWT
      const { data: { user } } = await client.auth.getUser(token)
      if (user) {
        // Cache the verified user so route handlers can call getUser() without the token
        const _getUser = client.auth.getUser.bind(client.auth)
        client.auth.getUser = async (jwt?: string) =>
          jwt ? _getUser(jwt) : { data: { user }, error: null }
        return client
      }
    }
  } catch (e) {
    // Bearer auth failed — fall through to cookie-based auth
    console.error('[Auth] Bearer token validation failed:', e)
  }

  // Default: cookie-based auth
  const cookieStore = await cookies()

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
