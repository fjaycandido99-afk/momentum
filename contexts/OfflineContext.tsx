'use client'

import { createContext, useContext, useEffect, useRef, useMemo, ReactNode } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { syncOfflineData } from '@/lib/offline/sync'

interface OfflineContextType {
  isOnline: boolean
  wasOffline: boolean
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  wasOffline: false,
})

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline, wasOffline } = useOnlineStatus()
  const prevOnline = useRef(isOnline)

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && !prevOnline.current) {
      syncOfflineData()
        .catch(err => console.error('Sync failed:', err))
    }
    prevOnline.current = isOnline
  }, [isOnline])

  const value = useMemo(() => ({ isOnline, wasOffline }), [isOnline, wasOffline])

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  return useContext(OfflineContext)
}
