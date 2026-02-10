'use client'

import { useState, useCallback, useEffect } from 'react'

export interface RecentlyPlayedItem {
  youtubeId: string
  title: string
  type: 'music' | 'motivation'
  genreId?: string
  genreWord?: string
  label: string
  background?: string
  playedAt: number
}

const STORAGE_KEY = 'voxu_recently_played'
const MAX_ITEMS = 10

function loadFromStorage(): RecentlyPlayedItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(items: RecentlyPlayedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

export function useRecentlyPlayed() {
  const [items, setItems] = useState<RecentlyPlayedItem[]>([])

  // Load on mount
  useEffect(() => {
    setItems(loadFromStorage())
  }, [])

  const addRecentlyPlayed = useCallback((item: Omit<RecentlyPlayedItem, 'playedAt'>) => {
    setItems(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(p => p.youtubeId !== item.youtubeId)
      const updated = [{ ...item, playedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS)
      saveToStorage(updated)
      return updated
    })
  }, [])

  return { recentlyPlayed: items, addRecentlyPlayed }
}
