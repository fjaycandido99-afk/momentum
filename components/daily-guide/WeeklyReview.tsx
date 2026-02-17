'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, Trophy, Flame, PenLine, Check, Loader2, ChevronRight, Sparkles, Target, X, Zap, Heart, TrendingUp, BarChart3, Brain } from 'lucide-react'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'

interface DayEntry {
  date: Date
  dayName: string
  journal_win?: string | null
  journal_gratitude?: string | null
  journal_intention?: string | null
  moduleCount: number
  energy_level?: string | null
  day_type?: string | null
  mood_before?: string | null
  mood_after?: string | null
}

interface WeeklyStats {
  completedDays: number
  partialDays: number
  totalModules: number
  journalEntries: number
  bestStreak: number
  wins: string[]
  dailyEntries: DayEntry[]
  energyDistribution: { low: number; normal: number; high: number }
  completionRate: number
  moodImprovedPercent: number
}

interface WeeklyReviewProps {
  onClose?: () => void
  isModal?: boolean
}

export function WeeklyReview({ onClose, isModal = false }: WeeklyReviewProps) {
  const subscription = useSubscriptionOptional()
  const [stats, setStats] = useState<WeeklyStats | null>(null)
  const [intention, setIntention] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [existingIntention, setExistingIntention] = useState<string | null>(null)
  const [showFullJournal, setShowFullJournal] = useState(false)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)

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
          const energyDist = { low: 0, normal: 0, high: 0 }
          let moodImprovedCount = 0
          let moodTrackedCount = 0

          // Create a map of entries by date
          const entryMap: Record<string, any> = {}
          entries.forEach((entry: any) => {
            const dateKey = new Date(entry.date).toISOString().split('T')[0]
            entryMap[dateKey] = entry
          })

          // Build daily entries for all 7 days
          const dailyEntries: DayEntry[] = []
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

          for (let i = 0; i < 7; i++) {
            const dayDate = new Date(start)
            dayDate.setDate(start.getDate() + i)
            const dateKey = dayDate.toISOString().split('T')[0]
            const entry = entryMap[dateKey]

            let moduleCount = 0
            if (entry) {
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

              // Track energy levels (string: 'low' | 'normal' | 'high')
              if (entry.energy_level) {
                if (entry.energy_level === 'low') energyDist.low++
                else if (entry.energy_level === 'normal') energyDist.normal++
                else if (entry.energy_level === 'high') energyDist.high++
              }

              // Track mood improvement (string: 'low' | 'medium' | 'high')
              if (entry.mood_before && entry.mood_after) {
                moodTrackedCount++
                const moodOrder: Record<string, number> = { low: 0, medium: 1, high: 2 }
                const before = moodOrder[entry.mood_before] ?? 0
                const after = moodOrder[entry.mood_after] ?? 0
                if (after > before) moodImprovedCount++
              }
            }

            dailyEntries.push({
              date: dayDate,
              dayName: dayNames[dayDate.getDay()],
              journal_win: entry?.journal_win || null,
              journal_gratitude: entry?.journal_gratitude || null,
              journal_intention: entry?.journal_intention || null,
              moduleCount,
              energy_level: entry?.energy_level ?? null,
              day_type: entry?.day_type ?? null,
              mood_before: entry?.mood_before ?? null,
              mood_after: entry?.mood_after ?? null,
            })
          }

          const completionRate = Math.round((completedDays / 7) * 100)
          const moodImprovedPercent = moodTrackedCount > 0
            ? Math.round((moodImprovedCount / moodTrackedCount) * 100)
            : 0

          setStats({
            completedDays,
            partialDays,
            totalModules,
            journalEntries,
            bestStreak: completedDays,
            wins: wins.slice(0, 5),
            dailyEntries,
            energyDistribution: energyDist,
            completionRate,
            moodImprovedPercent,
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

    // Fetch AI summary for users with weekly_ai_summary access
    if (subscription?.checkAccess('weekly_ai_summary')) {
      setAiSummaryLoading(true)
      fetch('/api/daily-guide/weekly-summary')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.summary) setAiSummary(data.summary)
        })
        .catch(err => console.error('AI summary error:', err))
        .finally(() => setAiSummaryLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription?.isPremium])

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
    <div className={isModal ? '' : 'rounded-2xl bg-black border border-white/25 shadow-[0_2px_20px_rgba(255,255,255,0.08)]'}>
      {/* Header */}
      <div className="p-4 border-b border-white/15 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <CalendarDays className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Weekly Review</h2>
            <p className="text-xs text-white/95">{weekLabel}</p>
          </div>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            aria-label="Close weekly review"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <X className="w-4 h-4 text-white/95" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-white/95 animate-spin" />
        </div>
      ) : (
        <>
          {/* Weekly Insights Card */}
          <div className="p-4 pb-2">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-medium text-indigo-300">Weekly Insights</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Energy Distribution */}
                <div>
                  <p className="text-[10px] text-white/95 uppercase tracking-wide mb-1.5">Energy</p>
                  {(stats?.energyDistribution.low || stats?.energyDistribution.normal || stats?.energyDistribution.high) ? (
                    <>
                      <div className="flex gap-1.5 mt-1">
                        <div className="flex items-center gap-0.5">
                          <div className="w-2 h-2 rounded-full bg-blue-400/60" />
                          <span className="text-[10px] text-white/95">Low {stats.energyDistribution.low}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <div className="w-2 h-2 rounded-full bg-amber-400/60" />
                          <span className="text-[10px] text-white/95">Normal {stats.energyDistribution.normal}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
                          <span className="text-[10px] text-white/95">High {stats.energyDistribution.high}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-white/95">No data</p>
                  )}
                </div>

                {/* Completion Rate */}
                <div>
                  <p className="text-[10px] text-white/95 uppercase tracking-wide mb-1.5">Completion</p>
                  <p className="text-lg font-bold text-white">{stats?.completionRate || 0}<span className="text-xs text-white/95 font-normal">%</span></p>
                  <p className="text-[10px] text-white/95">{stats?.completedDays || 0} full days</p>
                </div>

                {/* Journal Count */}
                <div>
                  <p className="text-[10px] text-white/95 uppercase tracking-wide mb-1.5">Journals</p>
                  <p className="text-lg font-bold text-white">{stats?.journalEntries || 0}<span className="text-xs text-white/95 font-normal">/7</span></p>
                  <p className="text-[10px] text-white/95">entries written</p>
                </div>

                {/* Mood Improvement */}
                <div>
                  <p className="text-[10px] text-white/95 uppercase tracking-wide mb-1.5">Mood Shift</p>
                  {stats && stats.moodImprovedPercent > 0 ? (
                    <>
                      <p className="text-lg font-bold text-emerald-400">
                        {stats.moodImprovedPercent}%
                      </p>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400/60" />
                        <span className="text-[10px] text-white/95">improved</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-white/95">No data</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Weekly Summary */}
          {(aiSummary || aiSummaryLoading) && (
            <div className="px-4 pb-2">
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-medium text-purple-300">Weekly Reflection</h3>
                </div>
                {aiSummaryLoading ? (
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-5/6 bg-white/5 rounded animate-pulse" />
                  </div>
                ) : (
                  <p className="text-sm text-white/95 leading-relaxed italic">
                    {aiSummary}
                  </p>
                )}
              </div>
            </div>
          )}

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
          {stats?.journalEntries && stats.journalEntries > 0 && (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white/95 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  What You Learned This Week
                </h3>
                <button
                  onClick={() => setShowFullJournal(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none rounded"
                >
                  View All
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {stats.wins.slice(0, 3).map((win, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/15">
                    <p className="text-sm text-white/95 italic line-clamp-2">"{win}"</p>
                  </div>
                ))}
                {stats.wins.length > 3 && (
                  <button
                    onClick={() => setShowFullJournal(true)}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white/95 text-sm hover:bg-white/10 transition-colors"
                  >
                    +{stats.wins.length - 3} more entries
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Weekly Intention */}
          <div className="p-4 border-t border-white/15">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-medium text-white/95">This Week's Intention</h3>
            </div>

            {existingIntention && isSaved ? (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Check className="w-4 h-4" />
                  <span className="text-xs font-medium">Set for this week</span>
                </div>
                <p className="text-white/95 italic">"{existingIntention}"</p>
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
                  aria-label="Weekly intention"
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/50 focus:outline-none focus:border-white/30 resize-none focus-visible:ring-2 focus-visible:ring-white/40"
                  rows={2}
                  maxLength={200}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-white/95">{intention.length}/200</span>
                  <button
                    onClick={handleSaveIntention}
                    disabled={!intention.trim() || isSaving}
                    aria-busy={isSaving}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
                      intention.trim()
                        ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30'
                        : 'bg-white/5 text-white/95 cursor-not-allowed'
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

  // Full Journal View Popup
  const fullJournalPopup = showFullJournal && stats?.dailyEntries && (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Weekly journal entries"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={() => setShowFullJournal(false)}
    >
      <div
        className="w-full max-w-md my-8 rounded-2xl bg-black border border-white/25 shadow-[0_2px_20px_rgba(255,255,255,0.08)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/15 flex items-center justify-between sticky top-0 bg-black">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <PenLine className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Week's Journal</h2>
              <p className="text-xs text-white/95">{weekLabel}</p>
            </div>
          </div>
          <button
            onClick={() => setShowFullJournal(false)}
            aria-label="Close journal"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <X className="w-5 h-5 text-white/95" />
          </button>
        </div>

        {/* Daily Entries */}
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {stats.dailyEntries.map((day, index) => (
            <div
              key={index}
              className={`rounded-xl border transition-all ${
                (day.journal_win || day.journal_gratitude || day.journal_intention)
                  ? 'bg-white/5 border-white/15 cursor-pointer hover:bg-white/10'
                  : 'bg-white/[0.02] border-white/5'
              }`}
              onClick={() => (day.journal_win || day.journal_gratitude || day.journal_intention) && setExpandedDay(expandedDay === index ? null : index)}
            >
              {/* Day Header */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center ${
                    day.moduleCount >= 4 ? 'bg-emerald-500/20' :
                    day.moduleCount > 0 ? 'bg-amber-500/20' : 'bg-white/5'
                  }`}>
                    <span className={`text-xs font-medium ${
                      day.moduleCount >= 4 ? 'text-emerald-400' :
                      day.moduleCount > 0 ? 'text-amber-400' : 'text-white/95'
                    }`}>
                      {day.date.getDate()}
                    </span>
                    <span className="text-[10px] text-white/95">
                      {day.dayName.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-white/95">{day.dayName}</p>
                    <p className="text-xs text-white/95">
                      {day.moduleCount > 0 ? `${day.moduleCount}/5 modules` : 'No activity'}
                      {(day.journal_win || day.journal_gratitude || day.journal_intention) && ' • Journal ✓'}
                    </p>
                  </div>
                </div>
                {(day.journal_win || day.journal_gratitude || day.journal_intention) && (
                  <ChevronRight className={`w-4 h-4 text-white/95 transition-transform ${
                    expandedDay === index ? 'rotate-90' : ''
                  }`} />
                )}
              </div>

              {/* Expanded Journal Content */}
              {expandedDay === index && (day.journal_win || day.journal_gratitude || day.journal_intention) && (
                <div className="px-3 pb-3 space-y-2">
                  {day.journal_win && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs text-blue-400 mb-1">What I learned:</p>
                      <p className="text-sm text-white/95 leading-relaxed">{day.journal_win}</p>
                    </div>
                  )}
                  {day.journal_gratitude && (
                    <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                      <p className="text-xs text-pink-400 mb-1 flex items-center gap-1">
                        <Heart className="w-3 h-3" /> Grateful for:
                      </p>
                      <p className="text-sm text-white/95 leading-relaxed">{day.journal_gratitude}</p>
                    </div>
                  )}
                  {day.journal_intention && (
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <p className="text-xs text-purple-400 mb-1 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Intention:
                      </p>
                      <p className="text-sm text-white/95 leading-relaxed">{day.journal_intention}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="p-4 border-t border-white/15 bg-white/[0.02]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/95">Total journal entries</span>
            <span className="text-blue-400 font-medium">{stats.journalEntries} / 7 days</span>
          </div>
        </div>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <>
        <div role="dialog" aria-modal="true" aria-label="Weekly review" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md my-8 rounded-2xl bg-black border border-white/25 shadow-[0_2px_20px_rgba(255,255,255,0.08)] overflow-hidden">
            {content}
          </div>
        </div>
        {fullJournalPopup}
      </>
    )
  }

  return (
    <>
      {content}
      {fullJournalPopup}
    </>
  )
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
      aria-label="Open weekly review"
      className="w-full p-4 rounded-2xl bg-black border border-white/25 shadow-[0_2px_20px_rgba(255,255,255,0.08)] transition-all group focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
            <CalendarDays className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-white">Weekly Review</h3>
            <p className="text-xs text-white/95">Reflect on your week & set intentions</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/95 group-hover:text-white/95 transition-colors" />
      </div>
    </button>
  )
}
