'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, Trophy, Flame, PenLine, Check, Loader2, ChevronRight, Sparkles, Target, X } from 'lucide-react'

interface WeeklyStats {
  completedDays: number
  partialDays: number
  totalModules: number
  journalEntries: number
  bestStreak: number
  wins: string[]
}

interface WeeklyReviewProps {
  onClose?: () => void
  isModal?: boolean
}

export function WeeklyReview({ onClose, isModal = false }: WeeklyReviewProps) {
  const [stats, setStats] = useState<WeeklyStats | null>(null)
  const [intention, setIntention] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [existingIntention, setExistingIntention] = useState<string | null>(null)

  // Get last week's date range
  const getLastWeekRange = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const lastSunday = new Date(today)
    lastSunday.setDate(today.getDate() - dayOfWeek - 7)
    lastSunday.setHours(0, 0, 0, 0)
    const lastSaturday = new Date(lastSunday)
    lastSaturday.setDate(lastSunday.getDate() + 6)
    lastSaturday.setHours(23, 59, 59, 999)
    return { start: lastSunday, end: lastSaturday }
  }

  // Fetch weekly data
  useEffect(() => {
    const fetchWeeklyData = async () => {
      setIsLoading(true)
      try {
        const { start, end } = getLastWeekRange()

        // Fetch journal entries for the past week
        const response = await fetch(
          `/api/daily-guide/journal?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
        )

        if (response.ok) {
          const data = await response.json()
          const entries = data.entries || []

          // Calculate stats
          let completedDays = 0
          let partialDays = 0
          let totalModules = 0
          let journalEntries = 0
          const wins: string[] = []

          entries.forEach((entry: any) => {
            let moduleCount = 0
            if (entry.morning_prime_done) moduleCount++
            if (entry.movement_done) moduleCount++
            if (entry.micro_lesson_done) moduleCount++
            if (entry.breath_done) moduleCount++
            if (entry.day_close_done) moduleCount++

            totalModules += moduleCount

            if (moduleCount >= 4) {
              completedDays++
            } else if (moduleCount > 0) {
              partialDays++
            }

            if (entry.journal_win) {
              journalEntries++
              wins.push(entry.journal_win)
            }
          })

          setStats({
            completedDays,
            partialDays,
            totalModules,
            journalEntries,
            bestStreak: completedDays, // Simplified
            wins: wins.slice(0, 5), // Top 5 wins
          })
        }

        // Check for existing intention for this week
        const today = new Date()
        const intentionResponse = await fetch(`/api/daily-guide/journal?date=${today.toISOString()}`)
        if (intentionResponse.ok) {
          const intentionData = await intentionResponse.json()
          if (intentionData.journal_intention) {
            setExistingIntention(intentionData.journal_intention)
            setIntention(intentionData.journal_intention)
            setIsSaved(true)
          }
        }
      } catch (error) {
        console.error('Failed to fetch weekly data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWeeklyData()
  }, [])

  const handleSaveIntention = async () => {
    if (!intention.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/daily-guide/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          journal_intention: intention.trim(),
        }),
      })

      if (response.ok) {
        setIsSaved(true)
        setExistingIntention(intention.trim())
      }
    } catch (error) {
      console.error('Failed to save intention:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const { start, end } = getLastWeekRange()
  const weekLabel = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  const content = (
    <div className={isModal ? '' : 'rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 overflow-hidden'}>
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <CalendarDays className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Weekly Review</h2>
            <p className="text-xs text-white/50">{weekLabel}</p>
          </div>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400/70 uppercase tracking-wide">Complete Days</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{stats?.completedDays || 0}</p>
              <p className="text-xs text-emerald-400/50">out of 7</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-400/70 uppercase tracking-wide">Modules Done</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">{stats?.totalModules || 0}</p>
              <p className="text-xs text-amber-400/50">completed</p>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <PenLine className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-400/70 uppercase tracking-wide">Journals</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">{stats?.journalEntries || 0}</p>
              <p className="text-xs text-blue-400/50">entries</p>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400/70 uppercase tracking-wide">Partial</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{stats?.partialDays || 0}</p>
              <p className="text-xs text-purple-400/50">days started</p>
            </div>
          </div>

          {/* Learnings from the week */}
          {stats?.wins && stats.wins.length > 0 && (
            <div className="px-4 pb-4">
              <h3 className="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                What You Learned This Week
              </h3>
              <div className="space-y-2">
                {stats.wins.map((win, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-white/80 italic">"{win}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Intention */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-medium text-white/80">This Week's Intention</h3>
            </div>

            {existingIntention && isSaved ? (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Check className="w-4 h-4" />
                  <span className="text-xs font-medium">Set for this week</span>
                </div>
                <p className="text-white/90 italic">"{existingIntention}"</p>
                <button
                  onClick={() => {
                    setIsSaved(false)
                  }}
                  className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Edit intention
                </button>
              </div>
            ) : (
              <>
                <textarea
                  value={intention}
                  onChange={(e) => {
                    setIntention(e.target.value)
                    setIsSaved(false)
                  }}
                  placeholder="What do you want to focus on this week?"
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
                  rows={2}
                  maxLength={200}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-white/30">{intention.length}/200</span>
                  <button
                    onClick={handleSaveIntention}
                    disabled={!intention.trim() || isSaving}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                      intention.trim()
                        ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Set Intention'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <div className="w-full max-w-md my-8 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 overflow-hidden">
          {content}
        </div>
      </div>
    )
  }

  return content
}

// Check if today is Sunday
export function isSunday(): boolean {
  return new Date().getDay() === 0
}

// Prompt to open weekly review
export function WeeklyReviewPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
            <CalendarDays className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-white">Weekly Review</h3>
            <p className="text-xs text-white/50">Reflect on your week & set intentions</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
      </div>
    </button>
  )
}
