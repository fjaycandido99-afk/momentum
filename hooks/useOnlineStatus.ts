'use client'

import { useState, useEffect, useCallback } from 'react'

export function useOnlineStatus() {
  // Always start as online to avoid hydration mismatch (server has no navigator)
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
    setWasOffline(true)
    // Clear the "back online" indicator after 3 seconds
    setTimeout(() => setWasOffline(false), 3000)
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
  }, [])

  useEffect(() => {
    // Sync with actual browser state after mount
    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return { isOnline, wasOffline }
}
