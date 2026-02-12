'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { MindsetId, MindsetConfig } from '@/lib/mindset/types'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'

const STORAGE_KEY = 'voxu_mindset'

interface MindsetContextValue {
  mindset: MindsetId
  config: MindsetConfig
  mindsetSelectedAt: Date | null
  isScholar: boolean
  backgroundPool: string[]
  setMindset: (id: MindsetId) => Promise<void>
  isLoading: boolean
}

const MindsetContext = createContext<MindsetContextValue | null>(null)

export function MindsetProvider({ children }: { children: ReactNode }) {
  const [mindset, setMindsetState] = useState<MindsetId>('stoic')
  const [mindsetSelectedAt, setMindsetSelectedAt] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load mindset from API or localStorage on mount
  useEffect(() => {
    async function loadMindset() {
      try {
        const response = await fetch('/api/daily-guide/preferences')
        if (response.ok) {
          const data = await response.json()
          if (data.isGuest) {
            // Guest: load from localStorage
            const stored = typeof window !== 'undefined'
              ? localStorage.getItem(STORAGE_KEY) as MindsetId | null
              : null
            if (stored && stored in MINDSET_CONFIGS) {
              setMindsetState(stored)
            }
          } else {
            if (data.mindset && data.mindset in MINDSET_CONFIGS) {
              setMindsetState(data.mindset)
            }
            if (data.mindset_selected_at) {
              setMindsetSelectedAt(new Date(data.mindset_selected_at))
            }
          }
        }
      } catch (error) {
        console.error('Failed to load mindset:', error)
        // Fallback: try localStorage
        const stored = typeof window !== 'undefined'
          ? localStorage.getItem(STORAGE_KEY) as MindsetId | null
          : null
        if (stored && stored in MINDSET_CONFIGS) {
          setMindsetState(stored)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadMindset()
  }, [])

  const setMindset = useCallback(async (id: MindsetId) => {
    setMindsetState(id)
    setMindsetSelectedAt(new Date())

    // Save to localStorage for guests
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id)
    }

    // Save to API (non-blocking)
    try {
      await fetch('/api/daily-guide/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mindset: id,
          // Auto-enable astrology for Scholar mindset
          ...(id === 'scholar' ? { astrology_enabled: true } : { astrology_enabled: false }),
        }),
      })
    } catch (error) {
      console.error('Failed to save mindset:', error)
    }
  }, [])

  const config = MINDSET_CONFIGS[mindset]

  const value: MindsetContextValue = {
    mindset,
    config,
    mindsetSelectedAt,
    isScholar: mindset === 'scholar',
    backgroundPool: config.backgroundPool,
    setMindset,
    isLoading,
  }

  return (
    <MindsetContext.Provider value={value}>
      {children}
    </MindsetContext.Provider>
  )
}

export function useMindset(): MindsetContextValue {
  const context = useContext(MindsetContext)
  if (!context) {
    throw new Error('useMindset must be used within a MindsetProvider')
  }
  return context
}

export function useMindsetOptional(): MindsetContextValue | null {
  return useContext(MindsetContext)
}
