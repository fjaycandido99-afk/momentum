'use client'

import { Flame, PenLine, Type } from 'lucide-react'

interface JournalEntry {
  date: string
  journal_win?: string | null
  journal_gratitude?: string | null
  journal_learned?: string | null
  journal_intention?: string | null
  journal_freetext?: string | null
}

export interface JournalStatsData {
  currentStreak: number
  longestStreak: number
  totalEntries: number
  totalWords: number
}

export function calculateJournalStats(entries: JournalEntry[]): JournalStatsData {
  // Sort by date descending
  const sorted = [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  let totalEntries = 0
  let totalWords = 0
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0

  const hasContent = (e: JournalEntry) =>
    e.journal_win || e.journal_gratitude || e.journal_learned || e.journal_intention || e.journal_freetext

  const wordCount = (s: string | null | undefined) =>
    s ? s.trim().split(/\s+/).filter(Boolean).length : 0

  // Calculate totals
  for (const entry of sorted) {
    if (hasContent(entry)) {
      totalEntries++
      totalWords += wordCount(entry.journal_win) + wordCount(entry.journal_gratitude) +
        wordCount(entry.journal_learned) + wordCount(entry.journal_intention) +
        wordCount(entry.journal_freetext)
    }
  }

  // Calculate streaks (checking consecutive days)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const entryDates = new Set(
    sorted.filter(hasContent).map(e => {
      const d = new Date(e.date)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    })
  )

  // Current streak: count back from today
  const checkDate = new Date(today)
  // Allow starting from today or yesterday
  if (!entryDates.has(checkDate.getTime())) {
    checkDate.setDate(checkDate.getDate() - 1)
  }
  while (entryDates.has(checkDate.getTime())) {
    currentStreak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  // Longest streak
  const sortedDates = Array.from(entryDates).sort((a, b) => a - b)
  tempStreak = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak)
  if (sortedDates.length === 0) longestStreak = 0

  return { currentStreak, longestStreak, totalEntries, totalWords }
}

interface JournalStatsProps {
  stats: JournalStatsData
}

export function JournalStats({ stats }: JournalStatsProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black border border-white/25 shadow-[0_1px_12px_rgba(255,255,255,0.08)]">
        <Flame className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-xs font-medium text-white">{stats.currentStreak}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black border border-white/25 shadow-[0_1px_12px_rgba(255,255,255,0.08)]">
        <PenLine className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-medium text-white">{stats.totalEntries}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black border border-white/25 shadow-[0_1px_12px_rgba(255,255,255,0.08)]">
        <Type className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-medium text-white">{stats.totalWords.toLocaleString()}</span>
      </div>
    </div>
  )
}
