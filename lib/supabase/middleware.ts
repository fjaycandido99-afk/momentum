import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Fallback values (these are public keys, safe to include)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jkrpreixylczfdfdyxrm.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprcnByZWl4eWxjemZkZmR5eHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODEzNDUsImV4cCI6MjA4NDI1NzM0NX0.dsOQiI2OtpmqYsFEPEgW0B0s_JiJ7ffg8Hn5b3iHm0A'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Add timeout to prevent MIDDLEWARE_INVOCATION_TIMEOUT on slow Supabase responses
  let user = null
  try {
    const userPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Auth timeout')), 4000)
    )
    const result = await Promise.race([userPromise, timeoutPromise]) as any
    user = result?.data?.user ?? null
  } catch {
    // On timeout or error, treat as guest (allow request through)
  }

  // Public/auth routes - always accessible
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup') ||
                     request.nextUrl.pathname.startsWith('/forgot-password')

  // API routes - always accessible
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // Public link routes - always accessible
  const isPublicLink = request.nextUrl.pathname.startsWith('/report/') ||
                       request.nextUrl.pathname.startsWith('/portal/') ||
                       request.nextUrl.pathname.startsWith('/invite/')

  // Protected routes that REQUIRE auth (very few)
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/jobs')

  // If it's an API, auth page, or public link - let it through
  if (isApiRoute || isAuthRoute || isPublicLink) {
    return supabaseResponse
  }

  // Only redirect to login for truly protected routes
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login/signup
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Everything else (home, daily-guide, discover, soundscape, settings, theme-setup)
  // is accessible to EVERYONE (guests and signed-in users)
  return supabaseResponse
}
