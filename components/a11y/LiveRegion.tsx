'use client'

import { useState, useCallback, createContext, useContext, ReactNode } from 'react'

interface LiveRegionContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void
}

const LiveRegionContext = createContext<LiveRegionContextType>({
  announce: () => {},
})

export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('')
      // Force re-render so screen readers pick up the change
      requestAnimationFrame(() => setAssertiveMessage(message))
    } else {
      setPoliteMessage('')
      requestAnimationFrame(() => setPoliteMessage(message))
    }
  }, [])

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      {/* Polite announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      {/* Assertive announcements */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  )
}

export function useAnnounce() {
  return useContext(LiveRegionContext)
}
