'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard'

/**
 * /dev-analytics?key=CRON_SECRET — the same dashboard as /admin, for a
 * browser that isn't signed in (and for curl).
 *
 * Kept because scripts use it, but /admin is the better door: a key in a
 * URL ends up in browser history, screenshots and shared links, and this
 * one also unlocks the cron endpoints.
 */
function KeyedDashboard() {
  const key = useSearchParams().get('key')
  if (!key) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p className="text-white/50">Access denied</p>
      </div>
    )
  }
  return <AnalyticsDashboard apiKey={key} />
}

export default function DevAnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>}>
      <KeyedDashboard />
    </Suspense>
  )
}
