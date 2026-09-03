import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Fallback values for client-side (these are public keys, safe to include)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jkrpreixylczfdfdyxrm.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprcnByZWl4eWxjemZkZmR5eHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODEzNDUsImV4cCI6MjA4NDI1NzM0NX0.dsOQiI2OtpmqYsFEPEgW0B0s_JiJ7ffg8Hn5b3iHm0A'

// Detect Capacitor native WebView
const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor

// One client per browser context, reused.
//
// This used to build a NEW client on every call, and callers invoke it in
// component render bodies — so every re-render spawned another GoTrue
// client, each with its own auth listener and token-refresh timer, all
// sharing one storage key. Loading the home screen produced 24 of them in
// forty seconds and climbing, with Supabase logging its own warning that
// this "may produce undefined behavior when used concurrently under the
// same storage key". Concurrent refreshes against one key are exactly how
// sessions get clobbered.
//
// Memoised rather than made a top-level const so nothing is constructed
// during SSR, and so the native/browser choice still happens at first use
// (window.Capacitor is not available at module-eval time). The type comes
// from the builder so callers keep the exact inference they had before.
function buildClient() {
  return isNative
    // Native WebView: the regular client stores sessions in localStorage.
    // WKWebView doesn't reliably persist cookies across app launches.
    ? createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    // Browser: SSR-aware client with cookie-based sessions.
    : createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

let client: ReturnType<typeof buildClient> | null = null

export function createClient() {
  return (client ??= buildClient())
}
