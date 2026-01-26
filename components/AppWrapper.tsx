'use client'

import { useState, useEffect, useMemo, createContext, useContext, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { SplashScreen } from '@/components/ui/SplashScreen'

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
  const pathname = usePathname()
  const [showSplash, setShowSplash] = useState(true)
  const [hasSeenSplash, setHasSeenSplash] = useState(false)
  const [isGuest, setIsGuest] = useState(true)

  // Auth pages should not show splash
  const isAuthPage = pathname?.startsWith('/login') ||
                     pathname?.startsWith('/signup') ||
                     pathname?.startsWith('/forgot-password') ||
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
