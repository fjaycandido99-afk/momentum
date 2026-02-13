'use client'

import { useOffline } from '@/contexts/OfflineContext'

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOffline()

  if (isOnline && !wasOffline) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-2 text-center text-sm font-medium transition-all duration-300 ${
        isOnline
          ? 'bg-emerald-500/90 text-white animate-fade-in'
          : 'bg-amber-500/90 text-black'
      }`}
      role="alert"
      aria-live="assertive"
    >
      {isOnline ? 'Back online — syncing...' : 'You are offline — changes will sync when reconnected'}
    </div>
  )
}
