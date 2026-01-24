import { createBrowserClient } from '@supabase/ssr'

// Fallback values for client-side (these are public keys, safe to include)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jkrpreixylczfdfdyxrm.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprcnByZWl4eWxjemZkZmR5eHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODEzNDUsImV4cCI6MjA4NDI1NzM0NX0.dsOQiI2OtpmqYsFEPEgW0B0s_JiJ7ffg8Hn5b3iHm0A'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
