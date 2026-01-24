import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Fallback values (these are public keys, safe to include)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jkrpreixylczfdfdyxrm.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprcnByZWl4eWxjemZkZmR5eHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODEzNDUsImV4cCI6MjA4NDI1NzM0NX0.dsOQiI2OtpmqYsFEPEgW0B0s_JiJ7ffg8Hn5b3iHm0A'

export async function createClient() {
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
