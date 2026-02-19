'use client'

import { useState, useEffect } from 'react'
import { Clock, Loader2, BookOpen } from 'lucide-react'

export function JournalLookback() {
  const [lookbackEntry, setLookbackEntry] = useState<{
    journal_win?: string | null
    journal_gratitude?: string | null
    journal_intention?: string | null
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLookback = async () => {
      try {
        const lastWeek = new Date()
        lastWeek.setDate(lastWeek.getDate() - 7)
        const dateStr = lastWeek.toISOString().split('T')[0]
        const response = await fetch(`/api/daily-guide/journal?date=${dateStr}`)
        if (response.ok) {
          const data = await response.json()
          if (data.journal_win || data.journal_gratitude || data.journal_intention) {
            setLookbackEntry(data)
          }
        }
      } catch (error) {
        console.error('Failed to load lookback:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchLookback()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
      </div>
    )
  }

  if (!lookbackEntry) return null

  const lastWeekDate = new Date()
  lastWeekDate.setDate(lastWeekDate.getDate() - 7)
  const dateLabel = lastWeekDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/15 overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <div className="p-2 rounded-xl bg-white/10">
          <Clock className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="font-medium text-white text-sm">This Time Last Week</h3>
          <p className="text-xs text-white/50">{dateLabel}</p>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {lookbackEntry.journal_win && (
          <div className="flex items-start gap-2">
            <BookOpen className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-white/70 italic">&quot;{lookbackEntry.journal_win}&quot;</p>
          </div>
        )}
        {lookbackEntry.journal_gratitude && (
          <div className="flex items-start gap-2">
            <span className="text-pink-400 text-xs mt-0.5 shrink-0">&#9829;</span>
            <p className="text-sm text-white/70 italic">{lookbackEntry.journal_gratitude}</p>
          </div>
        )}
        {lookbackEntry.journal_intention && (
          <div className="flex items-start gap-2">
            <span className="text-purple-400 text-xs mt-0.5 shrink-0">&#9678;</span>
            <p className="text-sm text-white/70 italic">{lookbackEntry.journal_intention}</p>
          </div>
        )}
      </div>
    </div>
  )
}
