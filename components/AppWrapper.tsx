'use client'

import { useState, useEffect, useMemo, createContext, useContext, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { useServiceWorker } from '@/hooks/useServiceWorker'
import { useDeepLink } from '@/hooks/useDeepLink'
import { useNativePush } from '@/hooks/useNativePush'
import { installAuthInterceptor } from '@/lib/auth-interceptor'
import { createClient } from '@/lib/supabase/client'
import { initRevenueCat } from '@/lib/revenuecat'

interface AppContextType {
  isGuest: boolean
  showSplash: boolean
  hasSeenSplash: boolean
}

const AppContext = createContext<AppContextType>({
  isGuest: true,
  showSplash: true,
  hasSeenSplash: false,
})

export function useApp() {
  return useContext(AppContext)
}

interface AppWrapperProps {
  children: ReactNode
}

export function AppWrapper({ children }: AppWrapperProps) {
  installAuthInterceptor()
  useServiceWorker()
  useDeepLink()
  useNativePush()
  const pathname = usePathname()
  const [showSplash, setShowSplash] = useState(true)
  const [hasSeenSplash, setHasSeenSplash] = useState(false)
  const [isGuest, setIsGuest] = useState(true)

  // Initialize RevenueCat on native
  useEffect(() => {
    const isNative = !!(window as any).Capacitor
    if (!isNative) return
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        initRevenueCat(session.user.id).catch(() => {})
      }
    })
  }, [])

  // Sync timezone to server for timezone-aware notifications
  // Must wait for auth so the preferences endpoint actually persists it
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz) return
    const stored = sessionStorage.getItem('voxu_tz_synced')
    if (stored === tz) return // Already synced this session

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return // Guest — skip, will retry on next session
      fetch('/api/daily-guide/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: tz }),
      }).then(res => res.json()).then(data => {
        // Only mark synced if the server actually saved it (not guest response)
        if (data.success && !data.isGuest) {
          sessionStorage.setItem('voxu_tz_synced', tz)
        }
      }).catch(() => {})
    })
  }, [])

  // Auth pages should not show splash
  const isAuthPage = pathname?.startsWith('/login') ||
                     pathname?.startsWith('/signup') ||
                     pathname?.startsWith('/forgot-password') ||
                     pathname?.startsWith('/reset-password') ||
                     pathname?.startsWith('/report/') ||
                     pathname?.startsWith('/portal/') ||
                     pathname?.startsWith('/invite/')

  // Check if user has seen splash before (session-based)
  useEffect(() => {
    if (isAuthPage) {
      setShowSplash(false)
      return
    }

    const seen = sessionStorage.getItem('voxu_splash_seen')
    if (seen) {
      setShowSplash(false)
      setHasSeenSplash(true)
    }
  }, [isAuthPage])

  const handleSplashComplete = () => {
    setShowSplash(false)
    setHasSeenSplash(true)
    sessionStorage.setItem('voxu_splash_seen', 'true')
  }

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isGuest,
    showSplash: isAuthPage ? false : showSplash,
    hasSeenSplash: isAuthPage ? true : hasSeenSplash,
  }), [isGuest, showSplash, hasSeenSplash, isAuthPage])

  // On auth pages, just render children without splash
  if (isAuthPage) {
    return (
      <AppContext.Provider value={contextValue}>
        {children}
      </AppContext.Provider>
    )
  }

  return (
    <AppContext.Provider value={contextValue}>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <div className={showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
        {children}
      </div>
    </AppContext.Provider>
  )
}
